import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  isPolicyAdmissible,
  type MinimalListingRegistryRow,
} from "../data-mass/minimal-listing-index-policy";
import {
  normalizeSourceDomain,
  projectExistingListingRepresentation,
  type ExistingListingProjectionInput,
} from "../data-mass/minimal-listing-projection";

type ListingRow = {
  id: number;
  title: string | null;
  property_type: string | null;
  city: string | null;
  district: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  thumbnail_url?: string | null;
  description_snippet: string | null;
};

type SourceRow = {
  id: number;
  property_listing_id: number;
  listing_url: string | null;
  source_url: string | null;
  is_active: boolean;
};

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const pageSize = 1000;

  const listingRows: ListingRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("property_listings")
      .select("*")
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as ListingRow[];
    listingRows.push(...page);
    if (page.length < pageSize) break;
  }

  const sourceRows: SourceRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("listing_sources")
      .select("id,property_listing_id,listing_url,source_url,is_active")
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as SourceRow[];
    sourceRows.push(...page);
    if (page.length < pageSize) break;
  }

  const { data: registryData, error: registryError } = await supabase
    .from("source_policy_registry")
    .select("source_domain,authorization_status,acquisition_mode,machine_gate,ingestion_gate,display_policy,policy_expires_at")
    .order("source_domain");
  if (registryError) throw registryError;
  const registryRows = (registryData ?? []) as MinimalListingRegistryRow[];

  const listingById = new Map(listingRows.map((row) => [row.id, row]));
  const policyByDomain = new Map(registryRows.map((row) => [row.source_domain, row]));
  const policyAdmissibleRegistryRows = registryRows.filter((row) => isPolicyAdmissible(row, now));

  let activeSourceRows = 0;
  let inactiveSourceRows = 0;
  let missingListingRows = 0;
  let malformedSourceUrls = 0;
  let policyRejectedRows = 0;
  let contractRejectedRows = 0;
  const projected: Array<ReturnType<typeof projectExistingListingRepresentation>> = [];

  for (const source of sourceRows) {
    if (!source.is_active) {
      inactiveSourceRows += 1;
      continue;
    }
    activeSourceRows += 1;
    const listing = listingById.get(source.property_listing_id);
    if (!listing) {
      missingListingRows += 1;
      continue;
    }
    const sourceDomain = normalizeSourceDomain(source.listing_url);
    if (!sourceDomain) {
      malformedSourceUrls += 1;
      continue;
    }
    const policy = policyByDomain.get(sourceDomain);
    if (!policy || !isPolicyAdmissible(policy, now)) {
      policyRejectedRows += 1;
      continue;
    }

    const input: ExistingListingProjectionInput = {
      sourceKind: "listing_source",
      propertyListingId: listing.id,
      sourceOfferId: source.id,
      listingUrl: source.listing_url,
      title: listing.title,
      propertyType: listing.property_type,
      city: listing.city,
      district: listing.district,
      priceMad: listing.price_mad,
      surfaceM2: listing.surface_m2,
      thumbnailUrl: listing.thumbnail_url ?? null,
      descriptionSnippet: listing.description_snippet,
    };

    try {
      projected.push(projectExistingListingRepresentation(input, policy, now));
    } catch {
      contractRejectedRows += 1;
    }
  }

  const proof = {
    schemaVersion: "MASS_3B_MINIMAL_LISTING_PROJECTION_SHADOW_V1",
    status: "PASS",
    mode: "shadow_read_only",
    generatedAt: now.toISOString(),
    headSha: process.env.GITHUB_HEAD_SHA ?? process.env.GITHUB_SHA ?? null,
    propertyListingRows: listingRows.length,
    listingSourceRows: sourceRows.length,
    activeSourceRows,
    inactiveSourceRows,
    registryRows: registryRows.length,
    policyAdmissibleRegistryRows: policyAdmissibleRegistryRows.length,
    missingListingRows,
    malformedSourceUrls,
    policyRejectedRows,
    contractRejectedRows,
    projectedRows: projected.length,
    projectedSourceDomains: [...new Set(projected.map((row) => row.sourceDomain))].sort(),
    sourceOfferSeedsRead: 0,
    sourceOfferSeedPromotions: 0,
    databaseWrites: 0,
    registryWrites: 0,
    searchActivations: 0,
    sourceNetworkRequests: 0,
    detailPageFetches: 0,
    permissionsInferred: 0,
  };

  const out = path.join(process.cwd(), ".tmp/data-mass-3b/results");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "proof.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
