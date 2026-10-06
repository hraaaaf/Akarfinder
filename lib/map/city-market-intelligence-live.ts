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
  type CityMarketMetricRow,
  type MarketAreaBasis,
  type MarketDistrictTarget,
} from "@/lib/map/city-market-intelligence";
import { readNeonListingMarketObservations } from "@/lib/map/neon-listing-market-observations";

function areaForDistrict(
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

  const observedRows = await readNeonListingMarketObservations(
    city.canonical_name,
    canonicalTargets.map((target) => target.slug),
  );
  const snapshotTimestamp = observedRows.reduce(
    (max, row) => String(row.updatedAt ?? "") > max ? String(row.updatedAt ?? "") : max,
    "",
  );
  const snapshotVersion =
    `${city.slug}-property-listings-v1:${snapshotTimestamp || "no-updated-at"}:${observedRows.length}`;

  const targets: MarketDistrictTarget[] = canonicalTargets.map((target) => ({
    districtSlug: target.slug,
    displayName: target.displayName,
    // The in-repo canonical geo registry is now the runtime resolver. A target
    // remains resolved even when the observed listing count for it is zero.
    runtimeResolved: true,
    areaKm2: target.areaKm2,
    areaBasis: target.areaBasis,
  }));

  return aggregateObservedDistrictMetrics({
    targets,
    rows: observedRows,
    snapshotVersion,
  });
}
