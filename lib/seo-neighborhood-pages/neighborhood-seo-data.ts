import type { NeighborhoodMetadata, DistrictSlug } from "./types";
import {
  getValidatedSeoNeighborhoods,
  isSeoEligibleGeoPair,
  normalizeGeoText,
} from "@/lib/geo/geo-entity-registry";
import { NEIGHBORHOOD_POINTS } from "@/lib/map/canonical-neighborhood-data";

const CONFIG: Record<DistrictSlug, { propertyTypes: string[]; nearbyDistricts: DistrictSlug[] }> = {
  maarif: { propertyTypes: ["appartement", "studio", "local commercial", "bureau"], nearbyDistricts: ["racine", "bourgogne"] },
  racine: { propertyTypes: ["appartement", "bureau", "local commercial"], nearbyDistricts: ["maarif", "bourgogne"] },
  "ain-diab": { propertyTypes: ["villa", "appartement", "duplex"], nearbyDistricts: ["maarif", "bourgogne"] },
  bourgogne: { propertyTypes: ["appartement", "studio", "bureau"], nearbyDistricts: ["maarif", "racine"] },
  agdal: { propertyTypes: ["appartement", "villa", "studio", "bureau"], nearbyDistricts: ["souissi", "hay-riad"] },
  souissi: { propertyTypes: ["villa", "appartement", "terrain"], nearbyDistricts: ["agdal", "hay-riad"] },
  "hay-riad": { propertyTypes: ["appartement", "villa", "bureau"], nearbyDistricts: ["agdal", "souissi"] },
  gueliz: { propertyTypes: ["appartement", "studio", "local commercial", "riad"], nearbyDistricts: ["hivernage"] },
  hivernage: { propertyTypes: ["appartement", "villa", "riad"], nearbyDistricts: ["gueliz"] },
  malabata: { propertyTypes: ["appartement", "villa", "duplex"], nearbyDistricts: [] },
  founty: { propertyTypes: ["appartement", "villa", "studio"], nearbyDistricts: [] },
};

function findMapIntelligence(city: string, neighborhood: string) {
  const cityNorm = normalizeGeoText(city);
  const districtNorm = normalizeGeoText(neighborhood);
  const point = NEIGHBORHOOD_POINTS.find(
    (candidate) =>
      normalizeGeoText(candidate.city) === cityNorm &&
      normalizeGeoText(candidate.neighborhood) === districtNorm,
  );
  if (!point) return undefined;
  return {
    priceLabel: point.priceSignal.label,
    pricePeriod: point.benchmark.period,
    confidence: point.confidence,
    lifestyleTags: [...point.lifestyleTags],
    proximityHighlights: [...point.proximityHighlights],
  };
}

function buildMetadata(entity: ReturnType<typeof getValidatedSeoNeighborhoods>[number]): NeighborhoodMetadata | null {
  const config = CONFIG[entity.slug as DistrictSlug];
  if (!config || !isSeoEligibleGeoPair(entity.city_slug, entity.slug)) return null;
  const cityDisplayName = entity.city_slug === "casablanca" ? "Casablanca"
    : entity.city_slug === "rabat" ? "Rabat"
    : entity.city_slug === "marrakech" ? "Marrakech"
    : entity.city_slug === "tanger" ? "Tanger"
    : "Agadir";
  return {
    slug: entity.slug as DistrictSlug,
    displayName: entity.canonical_name,
    citySlug: entity.city_slug,
    cityDisplayName,
    description: `AkarFinder aide à explorer des résultats immobiliers publics liés à ${entity.canonical_name}, ${cityDisplayName}, puis à vérifier les détails sur la source originale.`,
    propertyTypes: [...config.propertyTypes],
    nearbyDistricts: [...config.nearbyDistricts],
    intelligence: findMapIntelligence(cityDisplayName, entity.canonical_name),
  };
}

export const NEIGHBORHOOD_METADATA: Record<DistrictSlug, NeighborhoodMetadata> = Object.fromEntries(
  getValidatedSeoNeighborhoods()
    .map(buildMetadata)
    .filter((value): value is NeighborhoodMetadata => value !== null)
    .map((value) => [value.slug, value]),
) as Record<DistrictSlug, NeighborhoodMetadata>;

export function getNeighborhoodBySlug(
  citySlug: string,
  districtSlug: string,
): NeighborhoodMetadata | null {
  if (!isSeoEligibleGeoPair(citySlug, districtSlug)) return null;
  const n = NEIGHBORHOOD_METADATA[districtSlug as DistrictSlug];
  if (!n || n.citySlug !== citySlug) return null;
  return n;
}

export function getAllNeighborhoods(): NeighborhoodMetadata[] {
  return Object.values(NEIGHBORHOOD_METADATA);
}

export function getNeighborhoodsByCity(citySlug: string): NeighborhoodMetadata[] {
  return Object.values(NEIGHBORHOOD_METADATA).filter((n) => n.citySlug === citySlug);
}

export function buildNeighborhoodSearchQuery(
  district: string,
  city: string,
  type?: string,
): string {
  const base = type
    ? `${type} ${district} ${city}`
    : `appartement ${district} ${city}`;
  return encodeURIComponent(base);
}
