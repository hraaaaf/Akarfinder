import type { CityMetadata, CitySlug, SearchIntent } from "./types";
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

/**
 * SEO city data is now derived from the canonical Geo Entity Registry.
 * A city/neighborhood cannot silently enter controlled SEO navigation unless
 * it passed the explicit validation + SEO eligibility gate in that registry.
 */
export const CITY_METADATA: Record<CitySlug, CityMetadata> = Object.fromEntries(
  getValidatedSeoCities().map((city) => [
    city.slug,
    {
      slug: city.slug,
      displayName: city.canonical_name,
      frenchName: city.canonical_name,
      description: buildCityDescription(city.canonical_name),
      neighborhoods: getValidatedSeoNeighborhoods(city.slug).map((district) => district.canonical_name),
      popularSearches: POPULAR_SEARCHES[city.slug],
    } satisfies CityMetadata,
  ]),
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
