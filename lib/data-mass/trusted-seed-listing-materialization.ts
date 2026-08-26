import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  getDomainEntry,
  getListingUrlPatterns,
  isDomainAdmissible,
  isDomainExternalWebResult,
} from "@/lib/openserp-ingestion/domain-registry";
import { extractCityNational, extractDistrictNational } from "@/lib/openserp-ingestion/national-utils";
import { redactSensitiveText } from "@/lib/openserp-ingestion/utils";

const MAX_TRUSTED_PRICE_MAD = 30_000_000;
const WRITE_CHUNK = 25;

export type TrustedSeedListingInput = {
  seedId: string;
  canonicalUrl: string;
  sourceDomain: string;
  seedProvider: string;
  freshnessStatus: string;
  firstObservedAt: string;
  lastObservedAt: string;
  title: string | null;
  snippet: string | null;
  city: string | null;
  trustedPriceMad: number | null;
  economicStatus: string | null;
  propertyType: string | null;
  intent: string | null;
  documentKind: string | null;
  verticalClassification: string | null;
};

export type TrustedSeedListingDecision = {
  admitted: boolean;
  reasons: string[];
  input: TrustedSeedListingInput;
  city: string | null;
  district: string | null;
  priceMad: number | null;
  propertyType: string | null;
  intent: "sale" | "rent" | null;
};

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function matchesCurrentRegistryDetailUrl(sourceDomain: string, canonicalUrl: string): boolean {
  const url = safeUrl(canonicalUrl);
  if (!url) return false;
  const normalizedHost = url.hostname.toLowerCase().replace(/^www\./, "");
  if (normalizedHost !== sourceDomain.toLowerCase().replace(/^www\./, "")) return false;
  const entry = getDomainEntry(sourceDomain);
  if (!entry || !isDomainAdmissible(sourceDomain) || !isDomainExternalWebResult(sourceDomain)) return false;
  for (const raw of entry.blocked_url_patterns) {
    try {
      if (new RegExp(raw).test(url.pathname)) return false;
    } catch {
      return false;
    }
  }
  const patterns = getListingUrlPatterns(sourceDomain);
  return patterns.length > 0 && patterns.some((pattern) => pattern.test(url.pathname));
}

function urlHasSensitiveMaterial(value: string): boolean {
  const result = redactSensitiveText(value);
  return result.phone_hits > 0 || result.personal_email_hits > 0 || result.secret_hits > 0 || result.whatsapp_hits > 0;
}

function canonicalIntent(value: string | null): "sale" | "rent" | null {
  return value === "sale" || value === "rent" ? value : null;
}

export function evaluateTrustedSeedListing(input: TrustedSeedListingInput): TrustedSeedListingDecision {
  const reasons: string[] = [];
  if (input.economicStatus !== "trusted") reasons.push("economic_status_not_trusted");
  if (input.documentKind !== "LISTING") reasons.push("document_kind_not_listing");
  if (input.verticalClassification !== "real_estate_likely") reasons.push("vertical_not_real_estate_likely");
  if (!matchesCurrentRegistryDetailUrl(input.sourceDomain, input.canonicalUrl)) reasons.push("registry_detail_url_not_admissible");
  if (urlHasSensitiveMaterial(input.canonicalUrl)) reasons.push("sensitive_material_in_url");

  const price = input.trustedPriceMad;
  if (price === null || !Number.isFinite(price) || price <= 0 || price > MAX_TRUSTED_PRICE_MAD) {
    reasons.push("trusted_price_invalid");
  }

  const evidence = `${input.canonicalUrl} ${input.title ?? ""} ${input.snippet ?? ""}`;
  const explicitCity = extractCityNational(evidence);
  const explicitDistrict = extractDistrictNational(evidence);
  const city = input.city?.trim() || null;
  if (!city || !explicitCity || normalize(city) !== normalize(explicitCity)) reasons.push("explicit_city_missing_or_mismatch");
  if (!explicitDistrict || !city || normalize(explicitDistrict.city) !== normalize(city)) reasons.push("explicit_district_missing_or_mismatch");

  return {
    admitted: reasons.length === 0,
    reasons,
    input,
    city: reasons.includes("explicit_city_missing_or_mismatch") ? null : explicitCity,
    district: reasons.includes("explicit_district_missing_or_mismatch") ? null : explicitDistrict?.district ?? null,
    priceMad: reasons.includes("trusted_price_invalid") ? null : price,
    propertyType: input.propertyType,
    intent: canonicalIntent(input.intent),
  };
}

export function trustedSeedFingerprint(canonicalUrl: string): string {
  return createHash("sha256").update(`external_index_seed:${canonicalUrl}`, "utf8").digest("hex");
}

export function buildLinkOnlyPropertyRow(decision: TrustedSeedListingDecision, now: string) {
  if (!decision.admitted || !decision.city || !decision.district || decision.priceMad === null) {
    throw new Error("TRUSTED_SEED_ADMITTED_DECISION_REQUIRED");
  }
  const completeness = 35 + (decision.propertyType ? 10 : 0) + (decision.intent ? 10 : 0);
  return {
    canonical_fingerprint: trustedSeedFingerprint(decision.input.canonicalUrl),
    title: null,
    price_mad: Math.round(decision.priceMad),
    city: decision.city,
    district: decision.district,
    property_type: decision.propertyType,
    transaction_type: decision.intent,
    surface_m2: null,
    rooms_count: null,
    bedrooms_count: null,
    bathrooms_count: null,
    description_snippet: null,
    images_count: null,
    seller_name: null,
    data_completeness_score: completeness,
    field_confidence: {
      provider: decision.input.seedProvider,
      publication_lane: "external_index_link_only",
      origin_type: "external_index_seed",
      source_seed_id: decision.input.seedId,
      copied_source_content: false,
      price: "trusted_economic_ledger",
      city: "explicit_index_evidence",
      district: "explicit_index_evidence",
      freshness_status: decision.input.freshnessStatus,
    },
    updated_at: now,
  };
}

function chunk<T>(values: T[], size = WRITE_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

export async function materializeTrustedSeedListings(input: {
  runId: string;
  decisions: TrustedSeedListingDecision[];
}): Promise<{
  selected: number;
  newPropertyListings: number;
  newListingSources: number;
  newClusters: number;
  newMemberships: number;
  skippedExistingUrls: number;
  errors: Array<{ canonicalUrl: string; error: string }>;
}> {
  const db = getSupabaseServerClient();
  const admitted = input.decisions.filter((decision) => decision.admitted);
  const urls = [...new Set(admitted.map((decision) => decision.input.canonicalUrl))];
  const existingUrls = new Set<string>();
  for (const batch of chunk(urls)) {
    const response = await db.from("listing_sources").select("listing_url").in("listing_url", batch);
    if (response.error) throw new Error(response.error.message);
    for (const row of response.data ?? []) if (row.listing_url) existingUrls.add(row.listing_url);
  }
  const selected = admitted.filter((decision) => !existingUrls.has(decision.input.canonicalUrl));
  const errors: Array<{ canonicalUrl: string; error: string }> = [];
  let newPropertyListings = 0;
  let newListingSources = 0;
  let newClusters = 0;
  let newMemberships = 0;
  const now = new Date().toISOString();

  for (const batch of chunk(selected)) {
    try {
      const propertyPayload = batch.map((decision) => buildLinkOnlyPropertyRow(decision, now));
      const propertyResponse = await db
        .from("property_listings")
        .upsert(propertyPayload, { onConflict: "canonical_fingerprint" })
        .select("id,canonical_fingerprint");
      if (propertyResponse.error) throw new Error(propertyResponse.error.message);
      const propertyRows = propertyResponse.data as Array<{ id: number; canonical_fingerprint: string }>;
      const propertyByFingerprint = new Map(propertyRows.map((row) => [row.canonical_fingerprint, row.id]));
      newPropertyListings += propertyRows.length;

      const sourcePayload = batch.flatMap((decision) => {
        const propertyId = propertyByFingerprint.get(trustedSeedFingerprint(decision.input.canonicalUrl));
        if (!propertyId || decision.priceMad === null) return [];
        return [{
          property_listing_id: propertyId,
          source_name: decision.input.sourceDomain.replace(/\.[a-z.]+$/i, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase(),
          listing_url: decision.input.canonicalUrl,
          source_url: decision.input.canonicalUrl,
          first_seen_at: decision.input.firstObservedAt,
          last_seen_at: decision.input.lastObservedAt,
          is_active: decision.input.freshnessStatus !== "aging",
          source_offer_key: decision.input.seedId,
          origin_type: "external_index_seed",
          compliance_status: "link_only_index",
          content_fingerprint: null,
          ingestion_run_id: input.runId,
          displayed_price: Math.round(decision.priceMad),
          price_currency: "MAD",
          price_period: null,
          price_status: "valid",
        }];
      });
      const sourceResponse = await db
        .from("listing_sources")
        .upsert(sourcePayload, { onConflict: "listing_url" })
        .select("id,listing_url,property_listing_id");
      if (sourceResponse.error) throw new Error(sourceResponse.error.message);
      const sourceRows = sourceResponse.data as Array<{ id: number; listing_url: string; property_listing_id: number }>;
      newListingSources += sourceRows.length;

      const clusterPayload = sourceRows.map((source) => ({
        cluster_origin: "deterministic_same_source_identifier",
        legacy_property_listing_id: source.property_listing_id,
        created_by: `external-index-seed:${input.runId}`,
      }));
      const clusterResponse = await db
        .from("property_clusters")
        .upsert(clusterPayload, { onConflict: "legacy_property_listing_id" })
        .select("id,legacy_property_listing_id");
      if (clusterResponse.error) throw new Error(clusterResponse.error.message);
      const clusterRows = clusterResponse.data as Array<{ id: string; legacy_property_listing_id: number }>;
      newClusters += clusterRows.length;
      const clusterByListing = new Map(clusterRows.map((row) => [row.legacy_property_listing_id, row.id]));

      const memberPayload = sourceRows.flatMap((source) => {
        const clusterId = clusterByListing.get(source.property_listing_id);
        if (!clusterId) return [];
        return [{
          property_cluster_id: clusterId,
          source_offer_id: source.id,
          origin_type: "deterministic_same_source_identifier",
          added_by: `external-index-seed:${input.runId}`,
        }];
      });
      if (memberPayload.length > 0) {
        const memberResponse = await db
          .from("property_cluster_members")
          .upsert(memberPayload, { onConflict: "property_cluster_id,source_offer_id", ignoreDuplicates: true });
        if (memberResponse.error) throw new Error(memberResponse.error.message);
        newMemberships += memberPayload.length;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const decision of batch) errors.push({ canonicalUrl: decision.input.canonicalUrl, error: message });
    }
  }

  return {
    selected: selected.length,
    newPropertyListings,
    newListingSources,
    newClusters,
    newMemberships,
    skippedExistingUrls: admitted.length - selected.length,
    errors,
  };
}
