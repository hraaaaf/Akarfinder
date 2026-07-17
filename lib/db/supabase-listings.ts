// Server-only: Supabase equivalents of queryDbListings / queryDbStats.
// Returns the same DbListingRow / DbStats shapes so mapDbRowToListing works unchanged.
import type {
  DbListingRow,
  DbListingsQuery,
  DbListingsResult,
  DbStats,
} from "@/lib/listings/db-listings";
import { getSupabaseServerClient } from "./supabase-client";
import { isMarketIndexReadEnabled } from "@/lib/market-index/market-index-feature-flags";
import { SupabaseMarketIndexReadRepository } from "@/lib/market-index/market-index-read-repository";
import {
  resolveSourcesForListings,
  logMarketIndexReadMetrics,
} from "@/lib/market-index/market-index-read-service";
import {
  legacyActiveSourcePick,
  type ReadCandidateSource,
  type SourcePickOutcome,
} from "@/lib/market-index/market-index-read-adapter";

// PostgREST returns JSONB as parsed JS values; SQLite returns JSON strings.
// Normalise back to strings so mapDbRowToListing's parseJsonSafe() still works.
function jsonToString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

type SupabaseSourceRow = {
  // AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1: id/origin_type are additive
  // selected fields, only used when MARKET_INDEX_READ_ENABLED=true. When the
  // flag is false (default), they are fetched but never read -- the exact
  // pre-existing display fields and selection logic are untouched.
  id?: number;
  origin_type?: string | null;
  source_name: string;
  listing_url: string;
  source_url: string | null;
  is_active: boolean;
  first_seen_at: string;
};

type SupabaseListingRow = {
  id: number;
  canonical_fingerprint: string;
  title: string | null;
  price_mad: number | null;
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: string | null;
  surface_m2: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  description_snippet: string | null;
  images_count: number | null;
  // MUBAWAB-DB-THUMBNAILS-RISK-ACCEPTED-1: absent/undefined until the Supabase
  // migration (thumbnail_url column) is applied — SELECT * degrades gracefully.
  thumbnail_url?: string | null;
  seller_name: string | null;
  data_completeness_score: number;
  field_confidence: unknown;
  created_at: string;
  updated_at: string;
  duplicate_group_id: string | null;
  duplicate_score: number | null;
  reliability_score: number | null;
  reliability_badge: string | null;
  reliability_reasons: unknown;
  // P8A
  built_surface_m2: number | null;
  plot_surface_m2: number | null;
  condition: string | null;
  property_age_range: string | null;
  orientation: string | null;
  floor_type: string | null;
  floors_count: number | null;
  garden_m2: number | null;
  terrace_m2: number | null;
  garage_spaces: number | null;
  has_pool: boolean | null;
  has_concierge: boolean | null;
  has_moroccan_living_room: boolean | null;
  has_european_living_room: boolean | null;
  has_equipped_kitchen: boolean | null;
  premium_features: unknown;          // JSONB → string[] after jsonToString
  listing_sources?: SupabaseSourceRow[];
};

// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1: resolvedSource is provided only
// when MARKET_INDEX_READ_ENABLED=true and a batch resolution already ran for
// this listing (see querySupabaseListings/querySupabaseListingById below).
// When absent -- the flag is off, or the listing wasn't a Market Index
// candidate -- behavior is byte-identical to before this mission.
function mapToDbRow(row: SupabaseListingRow, resolvedSource?: ReadCandidateSource | null): DbListingRow {
  const sources = row.listing_sources ?? [];
  const activeSource =
    resolvedSource !== undefined
      ? resolvedSource
      : sources.find((s) => s.is_active) ?? sources[0] ?? null;

  return {
    id: row.id,
    canonical_fingerprint: row.canonical_fingerprint,
    title: row.title,
    price_mad: row.price_mad,
    city: row.city,
    district: row.district,
    property_type: row.property_type,
    transaction_type: row.transaction_type,
    surface_m2: row.surface_m2,
    rooms_count: row.rooms_count,
    bedrooms_count: row.bedrooms_count,
    bathrooms_count: row.bathrooms_count,
    description_snippet: row.description_snippet,
    images_count: row.images_count,
    thumbnail_url: row.thumbnail_url ?? null,
    seller_name: row.seller_name,
    data_completeness_score: row.data_completeness_score,
    // JSONB → JSON string so mapDbRowToListing's parseJsonSafe works unchanged
    field_confidence: jsonToString(row.field_confidence),
    created_at: row.created_at,
    updated_at: row.updated_at,
    duplicate_group_id: row.duplicate_group_id,
    duplicate_score: row.duplicate_score,
    reliability_score: row.reliability_score,
    reliability_badge: row.reliability_badge,
    reliability_reasons: jsonToString(row.reliability_reasons),
    // P8A: normalise Supabase BOOLEAN → INTEGER (0/1) to match SQLite convention.
    built_surface_m2: row.built_surface_m2,
    plot_surface_m2: row.plot_surface_m2,
    condition: row.condition,
    property_age_range: row.property_age_range,
    orientation: row.orientation,
    floor_type: row.floor_type,
    floors_count: row.floors_count,
    garden_m2: row.garden_m2,
    terrace_m2: row.terrace_m2,
    garage_spaces: row.garage_spaces,
    has_pool: row.has_pool === true ? 1 : 0,
    has_concierge: row.has_concierge === true ? 1 : 0,
    has_moroccan_living_room: row.has_moroccan_living_room === true ? 1 : 0,
    has_european_living_room: row.has_european_living_room === true ? 1 : 0,
    has_equipped_kitchen: row.has_equipped_kitchen === true ? 1 : 0,
    premium_features: jsonToString(row.premium_features),
    source_name: activeSource?.source_name ?? null,
    listing_url: activeSource?.listing_url ?? null,
    source_url: activeSource?.source_url ?? null,
  };
}

function normalizePropertyType(v?: string): string | undefined {
  if (!v) return undefined;
  const n = v.trim().toLowerCase();
  if (n === "appartement" || n === "apartment") return "apartment";
  if (n === "villa") return "villa";
  if (n === "terrain" || n === "land") return "land";
  if (n === "bureau" || n === "office") return "office";
  return v;
}

function normalizeTransactionType(v?: string): string | undefined {
  if (!v) return undefined;
  const n = v.trim().toLowerCase();
  if (n === "buy" || n === "sale" || n === "achat") return "sale";
  if (n === "rent" || n === "location") return "rent";
  if (n === "new" || n === "neuf") return "new";
  return v;
}

export async function querySupabaseListingById(
  id: number
): Promise<DbListingRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("property_listings")
    .select(
      "*, listing_sources(id, origin_type, source_name, listing_url, source_url, is_active, first_seen_at)"
    )
    .eq("id", id)
    .limit(1)
    .single();

  if (error || !data) {
    if (error?.code !== "PGRST116") {
      // PGRST116 = row not found — not an error worth logging
      console.error("[supabase-listings] getById error:", error?.message);
    }
    return null;
  }

  const typedRow = data as SupabaseListingRow;
  const resolvedSource = await resolveSingleListingSource(typedRow);
  return mapToDbRow(typedRow, resolvedSource);
}

// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1: resolves the Market-Index-aware
// source pick for a single listing, when the flag is on. Returns undefined
// (meaning "use the existing heuristic, unchanged") whenever the flag is
// off, the query fails, or the listing isn't a Market Index candidate.
async function resolveSingleListingSource(
  row: SupabaseListingRow,
): Promise<ReadCandidateSource | null | undefined> {
  if (!isMarketIndexReadEnabled()) return undefined;
  const sources = toReadCandidateSources(row.listing_sources);
  try {
    const repository = new SupabaseMarketIndexReadRepository(getSupabaseServerClient());
    const { picks, metrics } = await resolveSourcesForListings(repository, [
      { id: row.id, sources },
    ]);
    logMarketIndexReadMetrics(metrics);
    const outcome = picks.get(row.id);
    // Only return a resolved value when Market Index was actually used --
    // otherwise leave it undefined so mapToDbRow() falls through to the
    // exact, untouched legacy heuristic (never a possibly-stale outcome.source).
    return outcome?.usedMarketIndex ? outcome.source : undefined;
  } catch (err) {
    console.error("[market-index-read] resolution failed, falling back to legacy:", err);
    return undefined;
  }
}

function toReadCandidateSources(sources: SupabaseSourceRow[] | undefined): ReadCandidateSource[] {
  return (sources ?? []).map((s) => ({
    id: s.id ?? -1,
    source_name: s.source_name,
    listing_url: s.listing_url,
    source_url: s.source_url,
    is_active: s.is_active,
    origin_type: s.origin_type ?? null,
  }));
}

export async function querySupabaseListings(
  query: DbListingsQuery = {}
): Promise<DbListingsResult> {
  const supabase = getSupabaseServerClient();
  // Allow up to 500 rows for internal pre-filtering calls (searchDatabase passes
  // limit=200 to pre-filter at DB level before client-side text/budget filters).
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
  const offset = Math.max(query.offset ?? 0, 0);

  let q = supabase
    .from("property_listings")
    .select(
      "*, listing_sources(id, origin_type, source_name, listing_url, source_url, is_active, first_seen_at)",
      { count: "exact" }
    )
    .order("data_completeness_score", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  const pt = normalizePropertyType(query.property_type);
  const tt = normalizeTransactionType(query.transaction_type);

  if (query.city) q = q.eq("city", query.city);
  if (pt) q = q.eq("property_type", pt);
  if (tt) q = q.eq("transaction_type", tt);
  if (query.min_price != null) q = q.gte("price_mad", query.min_price);
  if (query.max_price != null) q = q.lte("price_mad", query.max_price);
  if (query.min_surface != null) q = q.gte("surface_m2", query.min_surface);
  if (query.max_surface != null) q = q.lte("surface_m2", query.max_surface);
  if (query.bedrooms != null) q = q.eq("bedrooms_count", query.bedrooms);

  const { data, count, error } = await q;

  if (error) {
    console.error("[supabase-listings] query error:", error.message);
    return { listings: [], total: 0 };
  }

  const rows = (data ?? []) as SupabaseListingRow[];
  const resolvedByListingId = await resolveBatchListingSources(rows);
  return {
    listings: rows.map((row) => mapToDbRow(row, resolvedByListingId.get(row.id))),
    total: count ?? 0,
  };
}

// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1: batched equivalent of
// resolveSingleListingSource, for the list endpoint. One extra query at most
// (property_clusters + property_cluster_members, filtered to only the
// candidate listings in this page) -- never one query per row.
async function resolveBatchListingSources(
  rows: SupabaseListingRow[],
): Promise<Map<number, ReadCandidateSource | null>> {
  const result = new Map<number, ReadCandidateSource | null>();
  if (!isMarketIndexReadEnabled() || rows.length === 0) return result;

  try {
    const repository = new SupabaseMarketIndexReadRepository(getSupabaseServerClient());
    const listings = rows.map((row) => ({
      id: row.id,
      sources: toReadCandidateSources(row.listing_sources),
    }));
    const { picks, metrics } = await resolveSourcesForListings(repository, listings);
    logMarketIndexReadMetrics(metrics);
    for (const [listingId, outcome] of picks) {
      if (outcome.usedMarketIndex) {
        result.set(listingId, outcome.source);
      }
      // When usedMarketIndex is false, deliberately leave the map entry
      // absent -- mapToDbRow() then falls through to the untouched legacy
      // heuristic (sources.find(is_active) ?? sources[0]), not to a
      // possibly-stale outcome.source value.
    }
  } catch (err) {
    console.error("[market-index-read] batch resolution failed, falling back to legacy:", err);
  }

  return result;
}

// Exported for unit tests -- lets a test assert the two picks agree without
// duplicating the heuristic.
export { legacyActiveSourcePick };
export type { SourcePickOutcome };

export async function querySupabaseStats(): Promise<DbStats> {
  const supabase = getSupabaseServerClient();

  const [totalRes, avgRes, dupRes] = await Promise.all([
    supabase
      .from("property_listings")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("property_listings")
      .select("data_completeness_score, reliability_score")
      .limit(5000),

    supabase
      .from("property_listings")
      .select("duplicate_group_id")
      .not("duplicate_group_id", "is", null)
      .limit(5000),
  ]);

  const rows = avgRes.data ?? [];
  const avg_completeness =
    rows.length > 0
      ? Math.round(
          (rows.reduce((s, r) => s + (r.data_completeness_score ?? 0), 0) /
            rows.length) *
            10
        ) / 10
      : 0;

  const reliabilityRows = rows.filter((r) => r.reliability_score != null);
  const avg_reliability =
    reliabilityRows.length > 0
      ? Math.round(
          (reliabilityRows.reduce(
            (s, r) => s + (r.reliability_score ?? 0),
            0
          ) /
            reliabilityRows.length) *
            10
        ) / 10
      : 0;

  const uniqueGroups = new Set(
    (dupRes.data ?? []).map((r) => r.duplicate_group_id)
  );

  return {
    total_listings: totalRes.count ?? 0,
    avg_completeness,
    duplicates_detected: uniqueGroups.size,
    avg_reliability,
  };
}
