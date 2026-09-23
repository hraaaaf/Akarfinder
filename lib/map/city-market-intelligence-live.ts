import {
  readMarketRowsByIds,
  readResolvedNeighborhoodEvents,
  readValidatedCityRows,
  readValidatedNeighborhoodRows,
} from "@/lib/map/market-intelligence-db-read";
import {
  GEO_NEIGHBORHOODS,
  resolveCityEntity,
} from "@/lib/geo/geo-entity-registry";
import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";
import { geometryAreaKm2 } from "@/lib/geo/geometry-area";
import { RABAT_MARKET_ZONES_SHADOW } from "@/lib/geo/rabat-market-zones-shadow";
import { getNeighborhoodsByCity } from "@/lib/map/canonical-neighborhood-data";
import {
  aggregateObservedDistrictMetrics,
  dedupeObservedMarketListings,
  type CityMarketMetricRow,
  type MarketAreaBasis,
  type MarketDistrictTarget,
  type MarketTransaction,
  type ObservedMarketListing,
} from "@/lib/map/city-market-intelligence";

const MAX_TARGET_EVENTS = 5000;\n\nfunction areaForDistrict(
  citySlug: string,
  districtSlug: string,
  canonicalNeighborhoodId: string,
): { areaKm2: number | null; areaBasis: MarketAreaBasis } {
  if (citySlug === "rabat") {
    const zone = RABAT_MARKET_ZONES_SHADOW.find((candidate) =>
      candidate.canonicalNeighborhoodIds.includes(canonicalNeighborhoodId),
    );
    if (zone && Number.isFinite(zone.areaKm2) && zone.areaKm2 > 0) {
      return { areaKm2: zone.areaKm2, areaBasis: "rabat_market_zone_shadow" };
    }
  }

  if (citySlug === "casablanca") {
    const geometry = CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.find(
      (candidate) => candidate.neighborhoodCanonicalId === districtSlug,
    );
    if (geometry) {
      const areaKm2 = geometryAreaKm2(geometry.geometry);
      if (Number.isFinite(areaKm2) && areaKm2 > 0) {
        return { areaKm2, areaBasis: "casablanca_osm_shadow" };
      }
    }
  }

  return { areaKm2: null, areaBasis: null };
}

function buildCanonicalTargets(citySlug: string): Array<{
  slug: string;
  displayName: string;
  canonicalId: string;
  areaKm2: number | null;
  areaBasis: MarketAreaBasis;
}> {
  const city = resolveCityEntity(citySlug);
  if (!city) return [];
  const visibleSlugs = new Set(
    getNeighborhoodsByCity(city.canonical_name).map((point) => point.neighborhoodSlug),
  );
  return GEO_NEIGHBORHOODS
    .filter((district) =>
      district.city_slug === city.slug &&
      district.validation_status === "validated" &&
      visibleSlugs.has(district.slug),
    )
    .map((district) => ({
      slug: district.slug,
      displayName: district.canonical_name,
      canonicalId: district.id,
      ...areaForDistrict(city.slug, district.slug, district.id),
    }));
}

export async function readCityMarketIntelligenceMetrics(
  cityInput: string,
): Promise<readonly CityMarketMetricRow[]> {
  const city = resolveCityEntity(cityInput);
  if (!city) throw new Error(`market intelligence unknown city: ${cityInput}`);

  const canonicalTargets = buildCanonicalTargets(city.slug);
  if (!canonicalTargets.length) return [];

  const cityRows = await readValidatedCityRows(city.slug);
  if ((cityRows ?? []).length !== 1) {
    throw new Error(`market intelligence expected one validated city ${city.slug}, got ${(cityRows ?? []).length}`);
  }
  const runtimeCityId = String(cityRows[0].id);

  const targetSlugs = canonicalTargets.map((target) => target.slug);
  const neighborhoodRows = await readValidatedNeighborhoodRows(runtimeCityId, targetSlugs);

  const runtimeNeighborhoodById = new Map<string, string>(
    (neighborhoodRows ?? []).map((row: any): [string, string] => [String(row.id), String(row.slug)]),
  );
  const runtimeIdBySlug = new Map<string, string>(
    (neighborhoodRows ?? []).map((row: any): [string, string] => [String(row.slug), String(row.id)]),
  );
  const runtimeNeighborhoodIds = [...runtimeNeighborhoodById.keys()];

  const targetEvents = await readResolvedNeighborhoodEvents(runtimeNeighborhoodIds, MAX_TARGET_EVENTS);
  if (targetEvents.length >= MAX_TARGET_EVENTS) {
    throw new Error(`market intelligence safety bound reached for ${city.slug}`);
  }

  const candidateSeedIds = [...new Set<string>(
    targetEvents
      .map((row: any) => String(row.source_record_id))
      .filter((value: string) => value.length > 0),
  )];
  const allCandidateEvents = await readByIds(
    db,
    "geo_resolution_events",
    "id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at",
    "source_record_id",
    candidateSeedIds,
  );

  const latest = new Map<string, any>();
  for (const event of allCandidateEvents) {
    if (event.source_record_type !== "source_offer_seed") continue;
    const seedId = String(event.source_record_id);
    if (newer(event, latest.get(seedId))) latest.set(seedId, event);
  }

  const currentEvents = [...latest.values()].filter((event: any) =>
    event.resolution_status === "resolved" &&
    runtimeNeighborhoodById.has(String(event.resolved_neighborhood_id)) &&
    (!event.resolved_city_id || String(event.resolved_city_id) === runtimeCityId),
  );
  const currentSeedIds = currentEvents.map((event: any) => String(event.source_record_id));

  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,canonical_url,vertical_classification,document_kind,display_eligibility,normalized_intent,normalized_price_mad,normalized_surface_m2,normalized_price_m2,freshness_status,updated_at",
    "seed_id",
    currentSeedIds,
  );
  const seedRows = await readByIds(
    db,
    "source_offer_seeds",
    "id,source_domain",
    "id",
    currentSeedIds,
  );
  const docs = new Map<string, any>(docsRows.map((row: any): [string, any] => [String(row.seed_id), row]));
  const seeds = new Map<string, any>(seedRows.map((row: any): [string, any] => [String(row.id), row]));
  const eventBySeed = new Map<string, any>(
    currentEvents.map((event: any): [string, any] => [String(event.source_record_id), event]),
  );

  const observedRows: ObservedMarketListing[] = currentSeedIds.flatMap((seedId) => {
    const doc = docs.get(seedId);
    const seed = seeds.get(seedId);
    const event = eventBySeed.get(seedId);
    if (!doc || !seed || !event) return [];
    if (doc.vertical_classification !== "real_estate_likely" || doc.document_kind !== "LISTING") return [];
    if (!["eligible_primary", "eligible_secondary"].includes(doc.display_eligibility)) return [];
    const transaction = normalizeTransaction(doc.normalized_intent);
    if (!transaction) return [];
    const districtSlug = runtimeNeighborhoodById.get(String(event.resolved_neighborhood_id));
    if (!districtSlug) return [];

    const normalizedPriceM2 = Number(doc.normalized_price_m2) > 0
      ? Number(doc.normalized_price_m2)
      : null;
    const price = Number(doc.normalized_price_mad) > 0
      ? Number(doc.normalized_price_mad)
      : null;
    const surface = Number(doc.normalized_surface_m2) > 0
      ? Number(doc.normalized_surface_m2)
      : null;
    const effectivePriceM2 = normalizedPriceM2 ?? (
      price != null && surface != null ? price / surface : null
    );
    const canonicalUrl = String(doc.canonical_url ?? "").trim();

    return [{
      districtSlug,
      transaction,
      canonicalKey: canonicalUrl || `seed:${seedId}`,
      updatedAt: doc.updated_at ? String(doc.updated_at) : null,
      pricePerM2: effectivePriceM2,
      fresh: doc.freshness_status === "fresh_confirmed",
      sourceDomain: String(seed.source_domain ?? "unknown"),
    }];
  });

  const deduped = dedupeObservedMarketListings(observedRows);
  const snapshotTimestamp = deduped.reduce(
    (max, row) => String(row.updatedAt ?? "") > max ? String(row.updatedAt ?? "") : max,
    "",
  );
  const snapshotVersion = `${city.slug}-observed-v1:${snapshotTimestamp || "no-updated-at"}:${deduped.length}`;

  const targets: MarketDistrictTarget[] = canonicalTargets.map((target) => ({
    districtSlug: target.slug,
    displayName: target.displayName,
    runtimeResolved: runtimeIdBySlug.has(target.slug),
    areaKm2: target.areaKm2,
    areaBasis: target.areaBasis,
  }));

  return aggregateObservedDistrictMetrics({
    targets,
    rows: deduped,
    snapshotVersion,
  });
}