// AKARFINDER-GEO-ENTITY-SCHEMA-V1
// Canonical geographic registry shared by SEO/Search/Map adapters.
// Only entities with validation_status="validated" and seo_eligible=true may
// generate controlled SEO pages. Aliases absorb accents/transliterations so
// ingestion labels do not create duplicate geographic entities.

export type GeoValidationStatus = "validated" | "pending_review";

export type CanonicalCityEntity = {
  id: string;
  slug: "casablanca" | "rabat" | "marrakech" | "tanger" | "agadir";
  canonical_name: string;
  aliases: string[];
  validation_status: GeoValidationStatus;
  seo_eligible: boolean;
};

export type CanonicalNeighborhoodEntity = {
  id: string;
  slug: string;
  canonical_name: string;
  aliases: string[];
  city_slug: CanonicalCityEntity["slug"];
  validation_status: GeoValidationStatus;
  seo_eligible: boolean;
  map_eligible: boolean;
};

export const GEO_CITIES: CanonicalCityEntity[] = [
  { id: "city_casablanca", slug: "casablanca", canonical_name: "Casablanca", aliases: ["Casa"], validation_status: "validated", seo_eligible: true },
  { id: "city_rabat", slug: "rabat", canonical_name: "Rabat", aliases: [], validation_status: "validated", seo_eligible: true },
  { id: "city_marrakech", slug: "marrakech", canonical_name: "Marrakech", aliases: ["Marrakesh"], validation_status: "validated", seo_eligible: true },
  { id: "city_tanger", slug: "tanger", canonical_name: "Tanger", aliases: ["Tangier"], validation_status: "validated", seo_eligible: true },
  { id: "city_agadir", slug: "agadir", canonical_name: "Agadir", aliases: [], validation_status: "validated", seo_eligible: true },
];

export const GEO_NEIGHBORHOODS: CanonicalNeighborhoodEntity[] = [
  // Casablanca
  { id: "district_casablanca_maarif", slug: "maarif", canonical_name: "Maârif", aliases: ["Maarif", "Maârif"], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_casablanca_racine", slug: "racine", canonical_name: "Racine", aliases: [], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: false },
  { id: "district_casablanca_ain_diab", slug: "ain-diab", canonical_name: "Aïn Diab", aliases: ["Ain Diab", "Aïn Diab"], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: false },
  { id: "district_casablanca_bourgogne", slug: "bourgogne", canonical_name: "Bourgogne", aliases: [], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: false },
  { id: "district_casablanca_finance_city", slug: "finance-city", canonical_name: "Casablanca Finance City", aliases: ["Finance City", "CFC"], city_slug: "casablanca", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_casablanca_bouskoura", slug: "bouskoura", canonical_name: "Bouskoura", aliases: [], city_slug: "casablanca", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Rabat
  { id: "district_rabat_agdal", slug: "agdal", canonical_name: "Agdal", aliases: [], city_slug: "rabat", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_rabat_souissi", slug: "souissi", canonical_name: "Souissi", aliases: [], city_slug: "rabat", validation_status: "validated", seo_eligible: true, map_eligible: false },
  { id: "district_rabat_hay_riad", slug: "hay-riad", canonical_name: "Hay Riad", aliases: ["Hay Ryad", "Riad"], city_slug: "rabat", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_rabat_hassan", slug: "hassan", canonical_name: "Hassan", aliases: [], city_slug: "rabat", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_rabat_ocean", slug: "ocean", canonical_name: "Océan", aliases: ["Ocean", "Océan"], city_slug: "rabat", validation_status: "validated", seo_eligible: false, map_eligible: false },

  // Marrakech
  { id: "district_marrakech_gueliz", slug: "gueliz", canonical_name: "Guéliz", aliases: ["Gueliz", "Guéliz"], city_slug: "marrakech", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_marrakech_hivernage", slug: "hivernage", canonical_name: "Hivernage", aliases: ["L'Hivernage"], city_slug: "marrakech", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_marrakech_ourika", slug: "route-de-lourika", canonical_name: "Route de l'Ourika", aliases: ["Ourika", "Route Ourika"], city_slug: "marrakech", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Tanger
  { id: "district_tanger_malabata", slug: "malabata", canonical_name: "Malabata", aliases: [], city_slug: "tanger", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_tanger_ville_nouvelle", slug: "ville-nouvelle", canonical_name: "Ville Nouvelle", aliases: ["Ville nouvelle"], city_slug: "tanger", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_tanger_marchan", slug: "marchan", canonical_name: "Marchan", aliases: ["Marshan"], city_slug: "tanger", validation_status: "validated", seo_eligible: false, map_eligible: false },

  // Agadir
  { id: "district_agadir_founty", slug: "founty", canonical_name: "Founty", aliases: [], city_slug: "agadir", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_agadir_talborjt", slug: "talborjt", canonical_name: "Talborjt", aliases: ["Quartier Talborjt"], city_slug: "agadir", validation_status: "validated", seo_eligible: false, map_eligible: true },
];

export function normalizeGeoText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesName(value: string, canonical: string, aliases: string[]): boolean {
  const normalized = normalizeGeoText(value);
  return [canonical, ...aliases].some((candidate) => normalizeGeoText(candidate) === normalized);
}

export function resolveCityEntity(value: string): CanonicalCityEntity | null {
  return GEO_CITIES.find((city) => matchesName(value, city.canonical_name, [city.slug, ...city.aliases])) ?? null;
}

export function resolveNeighborhoodEntity(city: string, neighborhood: string): CanonicalNeighborhoodEntity | null {
  const cityEntity = resolveCityEntity(city);
  if (!cityEntity) return null;
  return GEO_NEIGHBORHOODS.find(
    (district) => district.city_slug === cityEntity.slug && matchesName(neighborhood, district.canonical_name, [district.slug, ...district.aliases]),
  ) ?? null;
}

export function canonicalizeCityName(value: string): string {
  return resolveCityEntity(value)?.canonical_name ?? value.trim();
}

export function canonicalizeNeighborhoodName(city: string, neighborhood: string): string {
  return resolveNeighborhoodEntity(city, neighborhood)?.canonical_name ?? neighborhood.trim();
}

export function getValidatedSeoCities(): CanonicalCityEntity[] {
  return GEO_CITIES.filter((city) => city.validation_status === "validated" && city.seo_eligible);
}

export function getValidatedSeoNeighborhoods(citySlug?: CanonicalCityEntity["slug"]): CanonicalNeighborhoodEntity[] {
  return GEO_NEIGHBORHOODS.filter(
    (district) =>
      district.validation_status === "validated" &&
      district.seo_eligible &&
      (!citySlug || district.city_slug === citySlug),
  );
}

export function isSeoEligibleGeoPair(citySlug: string, neighborhoodSlug: string): boolean {
  return GEO_NEIGHBORHOODS.some(
    (district) =>
      district.city_slug === citySlug &&
      district.slug === neighborhoodSlug &&
      district.validation_status === "validated" &&
      district.seo_eligible,
  );
}
