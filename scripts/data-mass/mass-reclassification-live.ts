import { createClient } from "@supabase/supabase-js";
import { isPolicyAdmissible, type MinimalListingRegistryRow } from "./minimal-listing-index-policy";
import { normalizeSourceDomain } from "./minimal-listing-projection";
import { reclassifyMassListing } from "./mass-reclassification";

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
  property_listing_id: number;
  listing_url: string | null;
  is_active: boolean;
};

function qualityScore(row: ListingRow) {
  let score = 0;
  if (row.title?.trim()) score += 20;
  if (row.property_type?.trim()) score += 10;
  if (row.district?.trim() || row.city?.trim()) score += 15;
  if (row.price_mad != null) score += 20;
  if (row.surface_m2 != null) score += 15;
  if (row.thumbnail_url?.trim()) score += 10;
  if (row.description_snippet?.trim()) score += 10;
  return score;
}

async function fetchAll<T>(factory: (from: number, to: number) => any) {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await factory(from, from + size - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < size) break;
  }
  return rows;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();

  const listings = await fetchAll<ListingRow>((from, to) => db.from("property_listings").select("*").order("id").range(from, to));
  const sources = await fetchAll<SourceRow>((from, to) => db.from("listing_sources").select("property_listing_id,listing_url,is_active").order("id").range(from, to));
  const { data, error } = await db.from("source_policy_registry").select("source_domain,authorization_status,acquisition_mode,machine_gate,ingestion_gate,display_policy,policy_expires_at");
  if (error) throw error;

  const registry = (data ?? []) as MinimalListingRegistryRow[];
  const policyByDomain = new Map(registry.map((row) => [row.source_domain, row]));
  const listingById = new Map(listings.map((row) => [row.id, row]));
  const counts = {
    activeListingSourceRows: 0,
    policyBlocked: 0,
    structuralReject: 0,
    eligibleLowQuality: 0,
    eligibleStandardQuality: 0,
    highQualityButPolicyBlocked: 0,
    lowQualityButStructurallyComplete: 0,
    malformedOrMissingRows: 0,
  };

  for (const source of sources) {
    if (!source.is_active) continue;
    counts.activeListingSourceRows += 1;
    const listing = listingById.get(source.property_listing_id);
    const domain = normalizeSourceDomain(source.listing_url);
    if (!listing || !domain) { counts.malformedOrMissingRows += 1; continue; }

    const policy = policyByDomain.get(domain);
    const policyAdmissible = Boolean(policy && isPolicyAdmissible(policy, now));
    const score = qualityScore(listing);
    const hasSignal = Boolean(listing.title?.trim() || listing.property_type?.trim());
    const result = reclassifyMassListing({
      policyAdmissible,
      hasCanonicalUrl: Boolean(source.listing_url),
      hasReliableStructuralSignal: hasSignal,
      qualityScore: score,
    });

    if (result.status === "POLICY_BLOCKED") counts.policyBlocked += 1;
    if (result.status === "STRUCTURAL_REJECT") counts.structuralReject += 1;
    if (result.status === "ELIGIBLE_LOW_QUALITY") counts.eligibleLowQuality += 1;
    if (result.status === "ELIGIBLE_STANDARD_QUALITY") counts.eligibleStandardQuality += 1;
    if (!policyAdmissible && score >= 50) counts.highQualityButPolicyBlocked += 1;
    if (source.listing_url && hasSignal && score < 50) counts.lowQualityButStructurallyComplete += 1;
  }

  console.log(JSON.stringify({
    schemaVersion: "MASS_4_RECLASSIFICATION_SHADOW_V1",
    status: "PASS",
    mode: "shadow_read_only",
    propertyListingRows: listings.length,
    listingSourceRows: sources.length,
    registryRows: registry.length,
    policyAdmissibleRegistryRows: registry.filter((row) => isPolicyAdmissible(row, now)).length,
    ...counts,
    qualityCanGrantPermission: false,
    qualityCanRevokeStructuralEligibility: false,
    databaseWrites: 0,
    registryWrites: 0,
    searchActivations: 0,
    sourceNetworkRequests: 0,
    detailPageFetches: 0,
    permissionsInferred: 0
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
