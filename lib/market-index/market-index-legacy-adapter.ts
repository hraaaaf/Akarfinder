// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — legacy read adapter (mission section 16).
// Projects existing property_listings + listing_sources rows into Market Index
// domain shapes WITHOUT writing anything and WITHOUT modifying the source
// tables. This is read-only, in-memory projection logic only.
//
// Per docs/MARKET_INDEX_EXISTING_MODEL_AUDIT.md section 4: some existing
// property_listing_id values already have multiple listing_sources rows that
// are demonstrably NOT the same property (different URLs/titles). This
// adapter does NOT treat a multi-row group as a validated multi-source
// SourceOffer set for the same PropertyCluster -- it explicitly flags the
// ambiguity (`multi_source_unverified: true`) instead of silently presenting
// it as a resolved cluster. This is the adapter's core safety property.

import { classifyPrice } from "./market-index-price";
import type { PriceStatus } from "./market-index-types";

export type LegacyPropertyListingRow = {
  id: number;
  price_mad: number | null;
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: string | null;
  surface_m2: number | null;
  duplicate_group_id: string | null;
  field_confidence: string | null;
};

export type LegacySourceRow = {
  id: number;
  property_listing_id: number;
  source_name: string | null;
  listing_url: string | null;
  source_url: string | null;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
};

export type LegacyProjectedCluster = {
  legacy_property_listing_id: number;
  cluster_origin: "legacy_one_to_one_projection";
  price_status: PriceStatus;
  displayed_price: number | null;
  // Explicit signal, never silently dropped: this cluster's duplicate_group_id
  // (if any) is NOT treated as evidence of a validated multi-property cluster
  // -- see the audit finding. Surfaced here purely for visibility/debugging.
  legacy_duplicate_group_id_ignored: string | null;
  source_offers: LegacyProjectedSourceOffer[];
  // True when this legacy row has more than one listing_sources attachment.
  // The adapter does NOT resolve this ambiguity -- it is a signal for human
  // review, per the audit finding that some such groups are different
  // properties, not multiple publications of one.
  multi_source_unverified: boolean;
  unknown_fields_detected: string[];
};

export type LegacyProjectedSourceOffer = {
  legacy_listing_source_id: number;
  source_name: string | null;
  listing_url: string | null;
  source_url: string | null;
  is_active: boolean;
  first_observed_at: string;
  last_observed_at: string;
  origin_type: "persisted_openserp" | "legacy_import";
};

function isOpenSerpProvider(fieldConfidenceRaw: string | null): boolean {
  if (!fieldConfidenceRaw) return false;
  try {
    const parsed = JSON.parse(fieldConfidenceRaw) as { provider?: string; acquisition_provider?: string };
    return parsed.provider === "openserp" || parsed.acquisition_provider === "openserp";
  } catch {
    return false;
  }
}

const KNOWN_LISTING_FIELDS = new Set([
  "id",
  "price_mad",
  "city",
  "district",
  "property_type",
  "transaction_type",
  "surface_m2",
  "duplicate_group_id",
  "field_confidence",
]);

export function projectLegacyPropertyListing(
  listing: LegacyPropertyListingRow,
  sources: LegacySourceRow[],
  rawListingKeys?: string[],
): LegacyProjectedCluster {
  const priceClassification = classifyPrice(listing.price_mad);
  const openSerp = isOpenSerpProvider(listing.field_confidence);

  const sourceOffers: LegacyProjectedSourceOffer[] = sources
    .filter((s) => s.property_listing_id === listing.id)
    .map((s) => ({
      legacy_listing_source_id: s.id,
      source_name: s.source_name,
      listing_url: s.listing_url,
      source_url: s.source_url,
      is_active: s.is_active,
      first_observed_at: s.first_seen_at,
      last_observed_at: s.last_seen_at,
      origin_type: openSerp ? "persisted_openserp" : "legacy_import",
    }));

  const unknownFields = (rawListingKeys ?? []).filter((k) => !KNOWN_LISTING_FIELDS.has(k));

  return {
    legacy_property_listing_id: listing.id,
    cluster_origin: "legacy_one_to_one_projection",
    price_status: priceClassification.status,
    displayed_price: priceClassification.value,
    legacy_duplicate_group_id_ignored: listing.duplicate_group_id,
    source_offers: sourceOffers,
    multi_source_unverified: sourceOffers.length > 1,
    unknown_fields_detected: unknownFields,
  };
}

export function projectLegacyBatch(
  listings: LegacyPropertyListingRow[],
  sources: LegacySourceRow[],
): LegacyProjectedCluster[] {
  const sourcesByListing = new Map<number, LegacySourceRow[]>();
  for (const s of sources) {
    const arr = sourcesByListing.get(s.property_listing_id) ?? [];
    arr.push(s);
    sourcesByListing.set(s.property_listing_id, arr);
  }
  return listings.map((l) => projectLegacyPropertyListing(l, sourcesByListing.get(l.id) ?? []));
}
