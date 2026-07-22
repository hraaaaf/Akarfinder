import type { CityMetadata, CitySlug } from "./types";
import {
  getValidatedSeoCities,
  getValidatedSeoNeighborhoods,
} from "@/lib/geo/geo-entity-registry";

const POPULAR_SEARCHES: Record<CitySlug, string[]> = {
  casablanca: [
    "appartement Casablanca",
    "villa Casablanca",
    "location Casablanca",
    "programme neuf Casablanca",
  ],
  rabat: [
    "appartement Rabat",
    "villa Rabat",
    "location Rabat",
    "programme neuf Rabat",
  ],
  marrakech: [
    "appartement Marrakech",
    "riad Marrakech",
    "location Marrakech",
    "villa Marrakech",
  ],
  tanger: [
    "appartement Tanger",
    "villa Tanger",
    "location Tanger",
    "programme neuf Tanger",
  ],
  agadir: [
    "appartement Agadir",
    "villa Agadir",
    "location Agadir",
    "studio Agadir",
  ],
};

function buildCityDescription(city: string): string {
  return `AkarFinder aide à explorer des résultats immobiliers publics liés à ${city} et à accéder à la source originale pour vérifier les détails de chaque annonce.`;
}

function isSeoCitySlug(value: string): value is CitySlug {
  return value === "casablanca" || value === "rabat" || value === "marrakech" || value === "tanger" || value === "agadir";
}

/**
 * SEO city data is derived from the canonical Geo Entity Registry.
 * Map-only canonical cities stay in the same graph but cannot enter controlled
 * SEO navigation unless their explicit seo_eligible gate is opened.
 */
export const CITY_METADATA: Record<CitySlug, CityMetadata> = Object.fromEntries(
  getValidatedSeoCities()
    .filter((city) => isSeoCitySlug(city.slug))
    .map((city) => {
      const slug = city.slug as CitySlug;
      return [
        slug,
        {
          slug,
          displayName: city.canonical_name,
          frenchName: city.canonical_name,
          description: buildCityDescription(city.canonical_name),
          neighborhoods: getValidatedSeoNeighborhoods(slug).map((district) => district.canonical_name),
          popularSearches: POPULAR_SEARCHES[slug],
        } satisfies CityMetadata,
      ];
    }),
) as Record<CitySlug, CityMetadata>;

export function getCityBySlug(slug: string): CityMetadata | null {
  return CITY_METADATA[slug as CitySlug] || null;
}

export function getAllCities(): CityMetadata[] {
  return Object.values(CITY_METADATA);
}

// Safe search query generator (no Serper, no API call)
export function buildSearchQueryForCity(city: string, type?: string): string {
  const baseQuery = type ? `${type} ${city}` : `appartement ${city}`;
  return encodeURIComponent(baseQuery);
}

export function buildSearchQueryForIntent(
  city: string,
  intent: "acheter" | "louer",
): string {
  const query = intent === "acheter" ? `acheter ${city}` : `location ${city}`;
  return encodeURIComponent(query);
}
