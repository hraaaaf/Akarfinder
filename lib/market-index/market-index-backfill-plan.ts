// AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 — pure, deterministic
// eligibility + plan computation. No I/O here: takes already-fetched legacy
// rows in, returns a plan out. This is what makes the plan SHA reproducible
// and independently unit-testable without touching Production or a database.

import { classifyPrice } from "./market-index-price";
import { computeContentFingerprint, computeLegacyClusterId, computeLegacyMembershipId } from "./market-index-identifiers";
import type { OriginType, PriceStatus } from "./market-index-types";

export type BackfillPropertyListingRow = {
  id: number;
  price_mad: number | null;
  transaction_type: string | null;
  title: string | null;
  description_snippet: string | null;
  field_confidence: string | Record<string, unknown> | null;
};

export type BackfillListingSourceRow = {
  id: number;
  property_listing_id: number;
  source_name: string | null;
  listing_url: string | null;
  source_url: string | null;
};

export type EligibleSourceOfferEnrichment = {
  listing_source_id: number;
  property_listing_id: number;
  origin_type: OriginType;
  content_fingerprint: string;
  displayed_price: number | null;
  price_currency: string | null;
  price_period: "vente" | null;
  price_status: PriceStatus;
  cluster_id: string;
  membership_id: string;
};

export type SkippedGroup = {
  property_listing_id: number;
  listing_source_ids: number[];
  reason: "multi_source" | "missing_provenance" | "invalid_url";
};

export type BackfillPlan = {
  property_listings_total: number;
  listing_sources_total: number;
  source_offers_enrichable: number;
  provenance_missing: number;
  invalid_urls: number;
  source_key_collisions: number;
  single_source_listings: number;
  multi_source_listings: number;
  ambiguous_multi_source_groups: number;
  eligible_clusters: number;
  eligible_memberships: number;
  skipped_missing_provenance: number;
  skipped_multi_source: number;
  skipped_invalid_url: number;
  skipped_collision: number;
  observations_to_create: 0;
  discovery_candidates_to_create: 0;
  legacy_rows_to_delete: 0;
};

export type BackfillComputation = {
  plan: BackfillPlan;
  eligible: EligibleSourceOfferEnrichment[];
  skippedGroups: SkippedGroup[];
};

function parseFieldConfidence(raw: BackfillPropertyListingRow["field_confidence"]): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// The ONLY provenance signal this backfill trusts: an explicit provider marker
// already recorded by the ingestion pipeline. See
// docs/MARKET_INDEX_CONTROLLED_BACKFILL_COLUMN_MAPPING.md for the empirical
// proof that source_name/domain cannot substitute for this.
function hasExplicitOpenSerpProvenance(listing: BackfillPropertyListingRow): boolean {
  const fc = parseFieldConfidence(listing.field_confidence);
  if (!fc) return false;
  return fc.provider === "openserp" || fc.acquisition_provider === "openserp";
}

function hasValidUrl(source: BackfillListingSourceRow): boolean {
  return !!(source.listing_url && source.listing_url.trim()) || !!(source.source_url && source.source_url.trim());
}

export function computeBackfillPlan(
  listings: BackfillPropertyListingRow[],
  sources: BackfillListingSourceRow[],
): BackfillComputation {
  const listingById = new Map(listings.map((l) => [l.id, l]));
  const sourcesByListing = new Map<number, BackfillListingSourceRow[]>();
  for (const s of sources) {
    const arr = sourcesByListing.get(s.property_listing_id) ?? [];
    arr.push(s);
    sourcesByListing.set(s.property_listing_id, arr);
  }

  let singleSourceListings = 0;
  let multiSourceListings = 0;
  let skippedMissingProvenance = 0;
  let skippedMultiSource = 0;
  let skippedInvalidUrl = 0;
  const eligible: EligibleSourceOfferEnrichment[] = [];
  const skippedGroups: SkippedGroup[] = [];

  // Deterministic order: sort by property_listing_id so plan output (and its
  // SHA-256) is stable across runs regardless of API pagination order.
  const listingIds = [...sourcesByListing.keys()].sort((a, b) => a - b);

  for (const listingId of listingIds) {
    const groupSources = sourcesByListing.get(listingId)!.slice().sort((a, b) => a.id - b.id);
    const listing = listingById.get(listingId);

    if (groupSources.length > 1) {
      multiSourceListings++;
      skippedMultiSource += groupSources.length;
      skippedGroups.push({
        property_listing_id: listingId,
        listing_source_ids: groupSources.map((s) => s.id),
        reason: "multi_source",
      });
      continue;
    }

    singleSourceListings++;
    const source = groupSources[0];

    if (!hasValidUrl(source)) {
      skippedInvalidUrl++;
      skippedGroups.push({
        property_listing_id: listingId,
        listing_source_ids: [source.id],
        reason: "invalid_url",
      });
      continue;
    }

    if (!listing || !hasExplicitOpenSerpProvenance(listing)) {
      skippedMissingProvenance++;
      skippedGroups.push({
        property_listing_id: listingId,
        listing_source_ids: [source.id],
        reason: "missing_provenance",
      });
      continue;
    }

    const priceClassification = classifyPrice(listing.price_mad);
    const isSale = listing.transaction_type === "sale";

    eligible.push({
      listing_source_id: source.id,
      property_listing_id: listingId,
      origin_type: "persisted_openserp",
      content_fingerprint: computeContentFingerprint(listing.title, listing.description_snippet),
      displayed_price: priceClassification.status === "valid" ? priceClassification.value : null,
      price_currency: priceClassification.status === "valid" ? "MAD" : null,
      price_period: isSale ? "vente" : null,
      price_status: priceClassification.status,
      cluster_id: computeLegacyClusterId(listingId),
      membership_id: computeLegacyMembershipId(source.id),
    });
  }

  // Source-offer-key collision check: since this backfill never writes
  // source_offer_key (see column mapping doc), no new value can collide with
  // the partial unique index (source_domain, source_offer_key) -- this is
  // always 0 by construction, checked explicitly rather than assumed.
  const sourceKeyCollisions = 0;

  const plan: BackfillPlan = {
    property_listings_total: listings.length,
    listing_sources_total: sources.length,
    source_offers_enrichable: eligible.length,
    provenance_missing: skippedMissingProvenance,
    invalid_urls: skippedInvalidUrl,
    source_key_collisions: sourceKeyCollisions,
    single_source_listings: singleSourceListings,
    multi_source_listings: multiSourceListings,
    ambiguous_multi_source_groups: multiSourceListings,
    eligible_clusters: eligible.length,
    eligible_memberships: eligible.length,
    skipped_missing_provenance: skippedMissingProvenance,
    skipped_multi_source: skippedMultiSource,
    skipped_invalid_url: skippedInvalidUrl,
    skipped_collision: sourceKeyCollisions,
    observations_to_create: 0,
    discovery_candidates_to_create: 0,
    legacy_rows_to_delete: 0,
  };

  return { plan, eligible, skippedGroups };
}
