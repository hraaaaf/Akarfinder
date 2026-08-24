import { evaluateMetricReliability } from "../map/market-metric-reliability";
import { findMarketBenchmark } from "./market-benchmark-registry";
import type { CanonicalPropertyType, CanonicalPropertyV1, CanonicalTransactionType } from "../property-schema/core";
import type { NationalGeoResolverResult } from "../geo/national-partner-geo-resolver";

export const PARTNER_MARKET_SNAPSHOT_VERSION = "partner-market-v2" as const;

export type CertifiedNeighborhoodAreaV2 = {
  canonical_neighborhood_id: string;
  area_km2: number | null;
  certified: boolean;
  source_ref: string;
  geometry_version?: string | null;
};

export type PartnerMarketResolvedPropertyV2 = {
  property: CanonicalPropertyV1;
  geo: NationalGeoResolverResult;
};

export type PartnerMarketObservationV2 = {
  canonical_key: string;
  property_id: string;
  offer_id: string;
  city: string;
  neighborhood: string;
  canonical_neighborhood_id: string;
  transaction_type: CanonicalTransactionType;
  property_type: CanonicalPropertyType;
  price_per_m2_mad: number | null;
  updated_at: string | null;
  fresh: boolean;
  source_domain: string;
  source_id: string;
};

export type PartnerMarketBenchmarkV2 = {
  source: "yakeey";
  property_type: "appartement" | "villa";
  price_per_m2_mad: number;
  scope: "city" | "neighborhood";
  source_url: string | null;
  observed_at: string | null;
} | null;

export type PartnerMarketMetricRowV2 = {
  canonical_neighborhood_id: string;
  city: string;
  neighborhood: string;
  transaction_type: CanonicalTransactionType;
  listing_count: number;
  categories: Partial<Record<CanonicalPropertyType, number>>;
  price_sample_count: number;
  median_price_per_m2_mad: number | null;
  price_reliability: "insufficient" | "limited" | "moderate" | "strong";
  fresh_listing_percent: number;
  freshness_status: "fresh_confirmed" | "mixed" | "stale" | "unavailable";
  source_count: number;
  area_km2: number | null;
  area_certified: boolean;
  area_source_ref: string | null;
  listing_density_km2: number | null;
  benchmarks: {
    apartment: PartnerMarketBenchmarkV2;
    villa: PartnerMarketBenchmarkV2;
  };
  market_representativeness: "uncertified";
  snapshot_version: string;
  snapshot_at: string;
  provenance: string[];
};

export type PartnerMarketSnapshotV2 = {
  schema_version: typeof PARTNER_MARKET_SNAPSHOT_VERSION;
  snapshot_version: string;
  snapshot_at: string;
  freshness_window_days: number;
  market_representativeness: "uncertified";
  rows: PartnerMarketMetricRowV2[];
};

export type PartnerMarketMetricDeltaV2 = {
  canonical_neighborhood_id: string;
  transaction_type: CanonicalTransactionType;
  listing_count_delta: number | null;
  median_price_per_m2_delta: number | null;
  listing_density_km2_delta: number | null;
  previous_snapshot_version: string;
  current_snapshot_version: string;
};

const ELIGIBLE_AVAILABILITY = new Set(["available", "upcoming"]);

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function safeDateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sourceDomain(url: string | null, fallback: string): string {
  if (!url) return fallback;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || fallback;
  } catch {
    return fallback;
  }
}

function eligibleSurface(property: CanonicalPropertyV1): number | null {
  const facts = property.facts.surfaces;
  for (const candidate of [
    facts.surface_total_m2?.value,
    facts.surface_habitable_m2?.value,
    facts.surface_built_m2?.value,
  ]) {
    if (finitePositive(candidate)) return candidate;
  }
  return null;
}

function offerUpdatedAt(offer: CanonicalPropertyV1["offers"][number]): string | null {
  return offer.updated_at_source ?? offer.last_observed_at ?? offer.first_observed_at ?? offer.published_at_source ?? null;
}

function isFresh(updatedAt: string | null, snapshotAt: string, freshnessWindowDays: number): boolean {
  const observed = safeDateMs(updatedAt);
  const snapshot = safeDateMs(snapshotAt);
  if (observed == null || snapshot == null || observed > snapshot) return false;
  return snapshot - observed <= freshnessWindowDays * 86_400_000;
}

function eligibleOffers(property: CanonicalPropertyV1) {
  return property.offers.filter(
    (offer) =>
      offer.offer_status === "active" &&
      offer.compliance_status === "allowed" &&
      ELIGIBLE_AVAILABILITY.has(offer.availability_status),
  );
}

export function partnerPropertiesToMarketObservations(input: {
  resolved_properties: readonly PartnerMarketResolvedPropertyV2[];
  snapshot_at: string;
  freshness_window_days: number;
}): PartnerMarketObservationV2[] {
  const observations: PartnerMarketObservationV2[] = [];
  const bestByPropertyTransaction = new Map<string, PartnerMarketObservationV2>();

  for (const item of input.resolved_properties) {
    const neighborhoodId = item.geo.canonical_neighborhood_id;
    const city = item.geo.city?.name ?? null;
    const neighborhood = item.geo.neighborhood_name;
    if (!neighborhoodId || !city || !neighborhood) continue;

    const propertyType = item.property.facts.classification.property_type.value ?? "unknown";
    const surface = eligibleSurface(item.property);

    for (const offer of eligibleOffers(item.property)) {
      const price = offer.price_status === "valid" && finitePositive(offer.price_amount.value)
        ? offer.price_amount.value
        : null;
      const pricePerM2 = price != null && surface != null ? round2(price / surface) : null;
      const updatedAt = offerUpdatedAt(offer);
      const observation: PartnerMarketObservationV2 = {
        canonical_key: `${item.property.property_id}:${offer.transaction_type}`,
        property_id: item.property.property_id,
        offer_id: offer.offer_id,
        city,
        neighborhood,
        canonical_neighborhood_id: neighborhoodId,
        transaction_type: offer.transaction_type,
        property_type: propertyType,
        price_per_m2_mad: pricePerM2,
        updated_at: updatedAt,
        fresh: isFresh(updatedAt, input.snapshot_at, input.freshness_window_days),
        source_domain: sourceDomain(offer.source_url, offer.source_name || offer.source_id),
        source_id: offer.source_id,
      };

      const existing = bestByPropertyTransaction.get(observation.canonical_key);
      const existingTime = safeDateMs(existing?.updated_at) ?? -Infinity;
      const candidateTime = safeDateMs(observation.updated_at) ?? -Infinity;
      if (!existing || candidateTime >= existingTime) {
        bestByPropertyTransaction.set(observation.canonical_key, observation);
      }
    }
  }

  observations.push(...bestByPropertyTransaction.values());
  return observations;
}

function certifiedAreaFor(
  areas: readonly CertifiedNeighborhoodAreaV2[],
  neighborhoodId: string,
): CertifiedNeighborhoodAreaV2 | null {
  const matches = areas.filter((area) => area.canonical_neighborhood_id === neighborhoodId);
  if (matches.length !== 1) return null;
  const area = matches[0];
  if (!area.certified || !finitePositive(area.area_km2) || !area.source_ref.trim()) return null;
  return area;
}

function benchmarkFor(
  city: string,
  neighborhood: string,
  transaction: CanonicalTransactionType,
  propertyType: "apartment" | "villa",
): PartnerMarketBenchmarkV2 {
  if (transaction !== "sale") return null;
  const match = findMarketBenchmark({ city, neighborhood, property_type: propertyType });
  if (!match) return null;
  return {
    source: "yakeey",
    property_type: match.property_type,
    price_per_m2_mad: match.benchmark_price_per_m2,
    scope: match.scope,
    source_url: match.source_url,
    observed_at: match.benchmark_observed_at,
  };
}

export function aggregatePartnerMarketSnapshot(input: {
  resolved_properties: readonly PartnerMarketResolvedPropertyV2[];
  certified_areas?: readonly CertifiedNeighborhoodAreaV2[];
  snapshot_version: string;
  snapshot_at: string;
  freshness_window_days: number;
}): PartnerMarketSnapshotV2 {
  if (!input.snapshot_version.trim()) throw new Error("snapshot_version est obligatoire");
  if (safeDateMs(input.snapshot_at) == null) throw new Error("snapshot_at doit être une date valide");
  if (!Number.isFinite(input.freshness_window_days) || input.freshness_window_days <= 0) {
    throw new Error("freshness_window_days doit être strictement positif");
  }

  const observations = partnerPropertiesToMarketObservations({
    resolved_properties: input.resolved_properties,
    snapshot_at: input.snapshot_at,
    freshness_window_days: input.freshness_window_days,
  });
  const groups = new Map<string, PartnerMarketObservationV2[]>();
  for (const observation of observations) {
    const key = `${observation.canonical_neighborhood_id}::${observation.transaction_type}`;
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }

  const rows: PartnerMarketMetricRowV2[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    const priceObservations = group.flatMap((row) => finitePositive(row.price_per_m2_mad)
      ? [{ value: row.price_per_m2_mad, fresh: row.fresh, sourceDomain: row.source_domain }]
      : []);
    const reliability = evaluateMetricReliability({ listingCount: group.length, observations: priceObservations });
    const freshCount = group.filter((row) => row.fresh).length;
    const freshPercent = group.length ? round2((freshCount / group.length) * 100) : 0;
    const freshnessStatus = group.length === 0
      ? "unavailable" as const
      : freshCount === group.length
        ? "fresh_confirmed" as const
        : freshCount > 0
          ? "mixed" as const
          : "stale" as const;
    const categories: Partial<Record<CanonicalPropertyType, number>> = {};
    for (const row of group) categories[row.property_type] = (categories[row.property_type] ?? 0) + 1;

    const area = certifiedAreaFor(input.certified_areas ?? [], first.canonical_neighborhood_id);
    const density = area ? round2(group.length / area.area_km2!) : null;
    const sources = Array.from(new Set(group.map((row) => row.source_id).filter(Boolean)));

    rows.push({
      canonical_neighborhood_id: first.canonical_neighborhood_id,
      city: first.city,
      neighborhood: first.neighborhood,
      transaction_type: first.transaction_type,
      listing_count: group.length,
      categories,
      price_sample_count: reliability.sampleCount,
      median_price_per_m2_mad: reliability.median == null ? null : round2(reliability.median),
      price_reliability: reliability.level,
      fresh_listing_percent: freshPercent,
      freshness_status: freshnessStatus,
      source_count: new Set(group.map((row) => row.source_domain).filter(Boolean)).size,
      area_km2: area?.area_km2 ?? null,
      area_certified: area != null,
      area_source_ref: area?.source_ref ?? null,
      listing_density_km2: density,
      benchmarks: {
        apartment: benchmarkFor(first.city, first.neighborhood, first.transaction_type, "apartment"),
        villa: benchmarkFor(first.city, first.neighborhood, first.transaction_type, "villa"),
      },
      market_representativeness: "uncertified",
      snapshot_version: input.snapshot_version,
      snapshot_at: input.snapshot_at,
      provenance: Array.from(new Set(["partner_canonical_v2", "national_geo_resolver_v2", ...sources, ...(area ? [area.source_ref] : [])])),
    });
  }

  rows.sort((a, b) =>
    a.city.localeCompare(b.city) ||
    a.neighborhood.localeCompare(b.neighborhood) ||
    a.transaction_type.localeCompare(b.transaction_type),
  );

  return {
    schema_version: PARTNER_MARKET_SNAPSHOT_VERSION,
    snapshot_version: input.snapshot_version,
    snapshot_at: input.snapshot_at,
    freshness_window_days: input.freshness_window_days,
    market_representativeness: "uncertified",
    rows,
  };
}

function delta(previous: number | null, current: number | null): number | null {
  return previous == null || current == null ? null : round2(current - previous);
}

export function comparePartnerMarketSnapshots(
  previous: PartnerMarketSnapshotV2,
  current: PartnerMarketSnapshotV2,
): PartnerMarketMetricDeltaV2[] {
  const previousRows = new Map(
    previous.rows.map((row) => [`${row.canonical_neighborhood_id}::${row.transaction_type}`, row] as const),
  );

  return current.rows.map((row) => {
    const prior = previousRows.get(`${row.canonical_neighborhood_id}::${row.transaction_type}`);
    return {
      canonical_neighborhood_id: row.canonical_neighborhood_id,
      transaction_type: row.transaction_type,
      listing_count_delta: prior ? row.listing_count - prior.listing_count : null,
      median_price_per_m2_delta: prior ? delta(prior.median_price_per_m2_mad, row.median_price_per_m2_mad) : null,
      listing_density_km2_delta: prior ? delta(prior.listing_density_km2, row.listing_density_km2) : null,
      previous_snapshot_version: previous.snapshot_version,
      current_snapshot_version: current.snapshot_version,
    };
  });
}
