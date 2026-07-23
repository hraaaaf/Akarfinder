import {
  buildNeighborhoodSearchHref,
  getBenchmarkLabel as getRawBenchmarkLabel,
  NEIGHBORHOOD_POINTS as RAW_NEIGHBORHOOD_POINTS,
  type DataConfidence,
  type NeighborhoodConfidence,
  type NeighborhoodPoint,
} from "@/lib/map/neighborhood-data";
import {
  canonicalizeCityName,
  normalizeGeoText,
  resolveCityEntity,
  resolveNeighborhoodEntity,
} from "@/lib/geo/geo-entity-registry";

export type { DataConfidence, NeighborhoodConfidence, NeighborhoodPoint };

function canonicalizePoint(point: NeighborhoodPoint): NeighborhoodPoint {
  const cityEntity = resolveCityEntity(point.city);
  const canonicalCity = cityEntity?.canonical_name ?? canonicalizeCityName(point.city);
  const neighborhoodEntity = resolveNeighborhoodEntity(canonicalCity, point.neighborhood);

  if (!cityEntity || !neighborhoodEntity) {
    return {
      ...point,
      city: canonicalCity,
      searchHref: buildNeighborhoodSearchHref(canonicalCity, point.neighborhood),
    };
  }

  return {
    ...point,
    id: `${cityEntity.slug}-${neighborhoodEntity.slug}`,
    city: cityEntity.canonical_name,
    citySlug: cityEntity.slug,
    neighborhood: neighborhoodEntity.canonical_name,
    neighborhoodSlug: neighborhoodEntity.slug,
    slug: `${cityEntity.slug}-${neighborhoodEntity.slug}`,
    searchHref: buildNeighborhoodSearchHref(
      cityEntity.canonical_name,
      neighborhoodEntity.canonical_name,
    ),
  };
}

/**
 * Public map/read-model points with identity fields derived from the canonical
 * Geo Entity Registry. Raw map seeds retain coordinates/benchmarks/lifestyle
 * content only; they no longer define a competing public city/district identity.
 */
export const NEIGHBORHOOD_POINTS: NeighborhoodPoint[] = RAW_NEIGHBORHOOD_POINTS.map(canonicalizePoint);

export function getNeighborhoods(): NeighborhoodPoint[] {
  return NEIGHBORHOOD_POINTS.slice();
}

export function getNeighborhoodsByCity(city: string): NeighborhoodPoint[] {
  const canonicalCity = canonicalizeCityName(city);
  const normalized = normalizeGeoText(canonicalCity);
  if (!normalized || normalized === "all") return getNeighborhoods();
  return NEIGHBORHOOD_POINTS.filter(
    (point) => normalizeGeoText(point.city) === normalized,
  );
}

export function filterNeighborhoodsByCity(city: string): NeighborhoodPoint[] {
  return getNeighborhoodsByCity(city);
}

export function getNeighborhoodBySlug(
  citySlugOrName: string,
  neighborhoodSlugOrName: string,
): NeighborhoodPoint | null {
  const cityEntity = resolveCityEntity(citySlugOrName);
  if (!cityEntity) return null;
  const neighborhoodEntity = resolveNeighborhoodEntity(
    cityEntity.canonical_name,
    neighborhoodSlugOrName,
  );
  if (!neighborhoodEntity) return null;
  return (
    NEIGHBORHOOD_POINTS.find(
      (point) =>
        point.citySlug === cityEntity.slug &&
        point.neighborhoodSlug === neighborhoodEntity.slug,
    ) ?? null
  );
}

export function isKnownNeighborhood(city: string, neighborhood: string): boolean {
  return resolveNeighborhoodEntity(city, neighborhood) != null;
}

export function getNeighborhoodCities(): string[] {
  return Array.from(new Set(NEIGHBORHOOD_POINTS.map((point) => point.city))).sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

export function getNeighborhoodCityEntries(): Array<{ city: string; citySlug: string }> {
  const cities = new Map<string, string>();
  for (const point of NEIGHBORHOOD_POINTS) cities.set(point.citySlug, point.city);
  return Array.from(cities.entries())
    .map(([citySlug, city]) => ({ city, citySlug }))
    .sort((a, b) => a.city.localeCompare(b.city, "fr"));
}

export function getNeighborhoodCitiesForPages(): Array<{
  city: string;
  citySlug: string;
  neighborhoods: NeighborhoodPoint[];
}> {
  return getNeighborhoodCityEntries().map(({ city, citySlug }) => ({
    city,
    citySlug,
    neighborhoods: getNeighborhoodsByCity(city),
  }));
}

export function getBenchmarkLabel(point: NeighborhoodPoint): string {
  return getRawBenchmarkLabel(point);
}

export function getConfidenceLabel(confidence: DataConfidence): string {
  switch (confidence) {
    case "high":
      return "Données élevées";
    case "medium":
      return "Données moyennes";
    case "low":
      return "Données faibles";
  }
}
