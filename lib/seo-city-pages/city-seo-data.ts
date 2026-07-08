import type { CityMetadata, SearchIntent } from "./types";

export const CITY_METADATA: Record<string, CityMetadata> = {
  casablanca: {
    slug: "casablanca",
    displayName: "Casablanca",
    frenchName: "Casablanca",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Casablanca et à accéder à la source originale pour vérifier les détails de chaque annonce.",
    neighborhoods: [
      "Anfa",
      "Maarif",
      "Hivernage",
      "Bouskoura",
      "Dar Bouazza",
      "Côte d'Azur",
    ],
    popularSearches: [
      "appartement Casablanca",
      "villa Casablanca",
      "location Casablanca",
      "programme neuf Casablanca",
    ],
  },
  rabat: {
    slug: "rabat",
    displayName: "Rabat",
    frenchName: "Rabat",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Rabat et à accéder à la source originale pour vérifier les détails de chaque annonce.",
    neighborhoods: [
      "Agdal",
      "Hay Riad",
      "Souissi",
      "Océan",
      "Riad",
      "Hassan",
    ],
    popularSearches: [
      "appartement Rabat",
      "villa Rabat",
      "location Rabat",
      "programme neuf Rabat",
    ],
  },
  marrakech: {
    slug: "marrakech",
    displayName: "Marrakech",
    frenchName: "Marrakech",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Marrakech et à accéder à la source originale pour vérifier les détails de chaque annonce.",
    neighborhoods: [
      "Medina",
      "Guéliz",
      "Hivernage",
      "Palmeraie",
      "Tensift",
      "Ennakhil",
    ],
    popularSearches: [
      "appartement Marrakech",
      "riad Marrakech",
      "location Marrakech",
      "villa Marrakech",
    ],
  },
  tanger: {
    slug: "tanger",
    displayName: "Tanger",
    frenchName: "Tanger",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Tanger et à accéder à la source originale pour vérifier les détails de chaque annonce.",
    neighborhoods: [
      "Médina",
      "Kasbah",
      "Haute Kasbah",
      "Sidi Bousaid",
      "Rmilat",
      "Marchan",
    ],
    popularSearches: [
      "appartement Tanger",
      "villa Tanger",
      "location Tanger",
      "programme neuf Tanger",
    ],
  },
  agadir: {
    slug: "agadir",
    displayName: "Agadir",
    frenchName: "Agadir",
    description:
      "AkarFinder aide à explorer des résultats immobiliers publics liés à Agadir et à accéder à la source originale pour vérifier les détails de chaque annonce.",
    neighborhoods: [
      "Corniche",
      "Centre Ville",
      "Quartier Talborjt",
      "Drarga",
      "Cité Nouvelle",
      "Aït Melloul",
    ],
    popularSearches: [
      "appartement Agadir",
      "villa Agadir",
      "location Agadir",
      "studio Agadir",
    ],
  },
};

export function getCityBySlug(slug: string): CityMetadata | null {
  return CITY_METADATA[slug] || null;
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
