import type { NeighborhoodMetadata, DistrictSlug } from "./types";

export const NEIGHBORHOOD_METADATA: Record<DistrictSlug, NeighborhoodMetadata> = {
  maarif: {
    slug: "maarif",
    displayName: "Maârif",
    citySlug: "casablanca",
    cityDisplayName: "Casablanca",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Maârif, Casablanca, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "studio", "local commercial", "bureau"],
    nearbyDistricts: ["racine", "bourgogne"],
  },
  racine: {
    slug: "racine",
    displayName: "Racine",
    citySlug: "casablanca",
    cityDisplayName: "Casablanca",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Racine, Casablanca, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "bureau", "local commercial"],
    nearbyDistricts: ["maarif", "bourgogne"],
  },
  "ain-diab": {
    slug: "ain-diab",
    displayName: "Aïn Diab",
    citySlug: "casablanca",
    cityDisplayName: "Casablanca",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Aïn Diab, Casablanca, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["villa", "appartement", "duplex"],
    nearbyDistricts: ["maarif", "bourgogne"],
  },
  bourgogne: {
    slug: "bourgogne",
    displayName: "Bourgogne",
    citySlug: "casablanca",
    cityDisplayName: "Casablanca",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Bourgogne, Casablanca, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "studio", "bureau"],
    nearbyDistricts: ["maarif", "racine"],
  },
  agdal: {
    slug: "agdal",
    displayName: "Agdal",
    citySlug: "rabat",
    cityDisplayName: "Rabat",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Agdal, Rabat, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "villa", "studio", "bureau"],
    nearbyDistricts: ["souissi", "hay-riad"],
  },
  souissi: {
    slug: "souissi",
    displayName: "Souissi",
    citySlug: "rabat",
    cityDisplayName: "Rabat",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Souissi, Rabat, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["villa", "appartement", "terrain"],
    nearbyDistricts: ["agdal", "hay-riad"],
  },
  "hay-riad": {
    slug: "hay-riad",
    displayName: "Hay Riad",
    citySlug: "rabat",
    cityDisplayName: "Rabat",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Hay Riad, Rabat, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "villa", "bureau"],
    nearbyDistricts: ["agdal", "souissi"],
  },
  gueliz: {
    slug: "gueliz",
    displayName: "Guéliz",
    citySlug: "marrakech",
    cityDisplayName: "Marrakech",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Guéliz, Marrakech, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "studio", "local commercial", "riad"],
    nearbyDistricts: ["hivernage"],
  },
  hivernage: {
    slug: "hivernage",
    displayName: "Hivernage",
    citySlug: "marrakech",
    cityDisplayName: "Marrakech",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Hivernage, Marrakech, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "villa", "riad"],
    nearbyDistricts: ["gueliz"],
  },
  malabata: {
    slug: "malabata",
    displayName: "Malabata",
    citySlug: "tanger",
    cityDisplayName: "Tanger",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Malabata, Tanger, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "villa", "duplex"],
    nearbyDistricts: [],
  },
  founty: {
    slug: "founty",
    displayName: "Founty",
    citySlug: "agadir",
    cityDisplayName: "Agadir",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Founty, Agadir, puis à vérifier les détails sur la source originale.",
    propertyTypes: ["appartement", "villa", "studio"],
    nearbyDistricts: [],
  },
};

export function getNeighborhoodBySlug(
  citySlug: string,
  districtSlug: string,
): NeighborhoodMetadata | null {
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
