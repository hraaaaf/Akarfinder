import type { CityMarketMetricRow } from "../map/city-market-intelligence";
import { resolveCityEntity, resolveNeighborhoodEntity } from "../geo/geo-entity-registry";
import type { PartnerMarketMetricDeltaV2, PartnerMarketMetricRowV2 } from "./partner-market-aggregator-v2";

export const PARTNER_MARKET_DOWNSTREAM_VERSION = "partner-market-downstream-v2" as const;

export type PartnerMarketActivationStatusV2 = "full_downstream" | "search_card_only";

export type PartnerMarketMapProjectionV2 = CityMarketMetricRow & {
  canonicalNeighborhoodId: string;
  areaSourceRef: string | null;
  marketRepresentativeness: "uncertified";
};

export type PartnerMarketNeighborhoodCardV2 = {
  canonical_neighborhood_id: string;
  city: string;
  neighborhood: string;
  transaction_type: PartnerMarketMetricRowV2["transaction_type"];
  listing_count: number;
  median_price_per_m2_mad: number | null;
  price_sample_count: number;
  price_reliability: PartnerMarketMetricRowV2["price_reliability"];
  listing_density_km2: number | null;
  area_certified: boolean;
  categories: PartnerMarketMetricRowV2["categories"];
  freshness_status: PartnerMarketMetricRowV2["freshness_status"];
  source_count: number;
  benchmarks: PartnerMarketMetricRowV2["benchmarks"];
  trend: {
    listing_count_delta: number | null;
    median_price_per_m2_delta: number | null;
    listing_density_km2_delta: number | null;
    previous_snapshot_version: string;
    current_snapshot_version: string;
  } | null;
  market_representativeness: "uncertified";
  snapshot_version: string;
  snapshot_at: string;
};

export type PartnerMarketDownstreamProjectionV2 = {
  version: typeof PARTNER_MARKET_DOWNSTREAM_VERSION;
  activation_status: PartnerMarketActivationStatusV2;
  canonical_neighborhood_id: string;
  search: {
    href: string;
    city: string;
    district: string;
    transaction_type: PartnerMarketMetricRowV2["transaction_type"];
  };
  map: PartnerMarketMapProjectionV2;
  neighborhood_card: PartnerMarketNeighborhoodCardV2;
};

function safeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "quartier";
}

function searchHref(row: PartnerMarketMetricRowV2): string {
  const params = new URLSearchParams({ city: row.city, district: row.neighborhood });
  return `/search?${params.toString()}`;
}

function matchingDelta(
  row: PartnerMarketMetricRowV2,
  delta: PartnerMarketMetricDeltaV2 | null | undefined,
): PartnerMarketNeighborhoodCardV2["trend"] {
  if (!delta) return null;
  if (
    delta.canonical_neighborhood_id !== row.canonical_neighborhood_id ||
    delta.transaction_type !== row.transaction_type ||
    delta.current_snapshot_version !== row.snapshot_version
  ) return null;
  return {
    listing_count_delta: delta.listing_count_delta,
    median_price_per_m2_delta: delta.median_price_per_m2_delta,
    listing_density_km2_delta: delta.listing_density_km2_delta,
    previous_snapshot_version: delta.previous_snapshot_version,
    current_snapshot_version: delta.current_snapshot_version,
  };
}

function canonicalMapIdentity(row: PartnerMarketMetricRowV2): { slug: string; displayName: string } | null {
  const city = resolveCityEntity(row.city);
  if (!city) return null;
  const neighborhood = resolveNeighborhoodEntity(city.canonical_name, row.neighborhood);
  if (!neighborhood || neighborhood.id !== row.canonical_neighborhood_id) return null;
  return { slug: neighborhood.slug, displayName: neighborhood.canonical_name };
}

/**
 * Projects one canonical P4 snapshot row to Search, Map Intelligence and the
 * neighborhood card without creating a second market truth.
 *
 * Map metrics are always projected, but remain runtimeResolved=false unless
 * the caller proves that this exact canonical neighborhood ID is backed by a
 * map-runtime geometry. This preserves national scope without inventing a
 * polygon for N2-only neighborhoods.
 */
export function projectPartnerMarketDownstreamV2(input: {
  row: PartnerMarketMetricRowV2;
  delta?: PartnerMarketMetricDeltaV2 | null;
  map_runtime_resolved_neighborhood_ids?: ReadonlySet<string>;
}): PartnerMarketDownstreamProjectionV2 {
  const { row } = input;
  const canonical = canonicalMapIdentity(row);
  const runtimeResolved = Boolean(
    canonical && input.map_runtime_resolved_neighborhood_ids?.has(row.canonical_neighborhood_id),
  );
  const districtSlug = canonical?.slug ?? safeSlug(row.neighborhood);
  const displayName = canonical?.displayName ?? row.neighborhood;
  const safeArea = row.area_certified && row.area_km2 != null && Number.isFinite(row.area_km2) && row.area_km2 > 0
    ? row.area_km2
    : null;
  const safeDensity = safeArea != null && row.listing_density_km2 != null && Number.isFinite(row.listing_density_km2)
    ? row.listing_density_km2
    : null;

  const map: PartnerMarketMapProjectionV2 = {
    districtSlug,
    displayName,
    transactionType: row.transaction_type,
    runtimeResolved,
    areaKm2: safeArea,
    areaBasis: null,
    listingCount: row.listing_count,
    pricePerM2SampleCount: row.price_sample_count,
    medianPricePerM2Mad: row.median_price_per_m2_mad,
    observedListingDensityPerKm2: safeDensity,
    priceReliability: row.price_reliability,
    freshnessStatus:
      row.freshness_status === "fresh_confirmed" ? "fresh_confirmed" :
      row.freshness_status === "mixed" ? "mixed" :
      row.freshness_status === "unavailable" ? "unavailable" : "unconfirmed",
    snapshotVersion: row.snapshot_version,
    canonicalNeighborhoodId: row.canonical_neighborhood_id,
    areaSourceRef: safeArea != null ? row.area_source_ref : null,
    marketRepresentativeness: row.market_representativeness,
  };

  const neighborhoodCard: PartnerMarketNeighborhoodCardV2 = {
    canonical_neighborhood_id: row.canonical_neighborhood_id,
    city: row.city,
    neighborhood: row.neighborhood,
    transaction_type: row.transaction_type,
    listing_count: row.listing_count,
    median_price_per_m2_mad: row.median_price_per_m2_mad,
    price_sample_count: row.price_sample_count,
    price_reliability: row.price_reliability,
    listing_density_km2: safeDensity,
    area_certified: safeArea != null,
    categories: { ...row.categories },
    freshness_status: row.freshness_status,
    source_count: row.source_count,
    benchmarks: row.benchmarks,
    trend: matchingDelta(row, input.delta),
    market_representativeness: row.market_representativeness,
    snapshot_version: row.snapshot_version,
    snapshot_at: row.snapshot_at,
  };

  return {
    version: PARTNER_MARKET_DOWNSTREAM_VERSION,
    activation_status: runtimeResolved ? "full_downstream" : "search_card_only",
    canonical_neighborhood_id: row.canonical_neighborhood_id,
    search: {
      href: searchHref(row),
      city: row.city,
      district: row.neighborhood,
      transaction_type: row.transaction_type,
    },
    map,
    neighborhood_card: neighborhoodCard,
  };
}

export function projectPartnerMarketSnapshotDownstreamV2(input: {
  rows: readonly PartnerMarketMetricRowV2[];
  deltas?: readonly PartnerMarketMetricDeltaV2[];
  map_runtime_resolved_neighborhood_ids?: ReadonlySet<string>;
}): PartnerMarketDownstreamProjectionV2[] {
  const deltaByKey = new Map(
    (input.deltas ?? []).map((delta) => [
      `${delta.canonical_neighborhood_id}:${delta.transaction_type}:${delta.current_snapshot_version}`,
      delta,
    ] as const),
  );
  return input.rows.map((row) => projectPartnerMarketDownstreamV2({
    row,
    delta: deltaByKey.get(`${row.canonical_neighborhood_id}:${row.transaction_type}:${row.snapshot_version}`) ?? null,
    map_runtime_resolved_neighborhood_ids: input.map_runtime_resolved_neighborhood_ids,
  }));
}
