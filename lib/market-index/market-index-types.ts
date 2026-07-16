// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — domain types.
// See docs/MARKET_INDEX_DATA_MODEL.md for the full field-by-field rationale.

export type DiscoveryStatus =
  | "discovered"
  | "accepted"
  | "rejected"
  | "unclassified"
  | "expired"
  | "promoted_to_source_offer";

export type DiscoveryCandidate = {
  id: string;
  provider: string;
  discovery_query: string | null;
  query_hash: string;
  result_rank: number | null;
  source_domain: string;
  source_url: string;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovered_at: string;
  last_seen_at: string;
  discovery_status: DiscoveryStatus;
  compliance_status: string | null;
  content_fingerprint: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type OriginType =
  | "partner_api"
  | "partner_feed"
  | "first_party_user"
  | "persisted_openserp"
  | "authorized_static_page"
  | "legacy_import";

export type PriceStatus = "valid" | "not_disclosed" | "invalid" | "ambiguous" | "unavailable";

// SourceOffer = the existing listing_sources row, extended additively.
// Only the new fields are modeled here; the pre-existing columns
// (id, property_listing_id, source_name, listing_url, source_url,
// is_active, first_seen_at, last_seen_at) are untouched and out of scope
// for this domain type — see the legacy adapter for how the two combine.
export type SourceOfferExtension = {
  source_offer_key: string | null;
  origin_type: OriginType | null;
  compliance_status: string | null;
  content_fingerprint: string | null;
  ingestion_run_id: string | null;
  displayed_price: number | null;
  price_currency: string | null;
  price_period: string | null;
  price_status: PriceStatus | null;
};

export type ClusterOrigin =
  | "manual_review"
  | "explicit_partner_identifier"
  | "deterministic_same_source_identifier"
  | "legacy_one_to_one_projection";

export type PropertyCluster = {
  id: string;
  cluster_origin: ClusterOrigin;
  legacy_property_listing_id: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  notes: string | null;
};

export type PropertyClusterMember = {
  id: string;
  property_cluster_id: string;
  source_offer_id: number;
  added_at: string;
  added_by: string | null;
  origin_type: ClusterOrigin;
};

export type Observation = {
  id: string;
  source_offer_id: number;
  observed_at: string;
  displayed_price: number | null;
  currency: string | null;
  surface_m2: number | null;
  title_fingerprint: string | null;
  content_fingerprint: string | null;
  source_status: string | null;
  availability_claim: string | null;
  observation_origin: string;
  ingestion_run_id: string | null;
  created_at: string;
};

export const ALLOWED_CLUSTER_ORIGINS: readonly ClusterOrigin[] = [
  "manual_review",
  "explicit_partner_identifier",
  "deterministic_same_source_identifier",
  "legacy_one_to_one_projection",
];

export const ALLOWED_ORIGIN_TYPES: readonly OriginType[] = [
  "partner_api",
  "partner_feed",
  "first_party_user",
  "persisted_openserp",
  "authorized_static_page",
  "legacy_import",
];

export const ALLOWED_PRICE_STATUSES: readonly PriceStatus[] = [
  "valid",
  "not_disclosed",
  "invalid",
  "ambiguous",
  "unavailable",
];

export const ALLOWED_DISCOVERY_STATUSES: readonly DiscoveryStatus[] = [
  "discovered",
  "accepted",
  "rejected",
  "unclassified",
  "expired",
  "promoted_to_source_offer",
];
