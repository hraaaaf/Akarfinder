// AKARFINDER-GEO-ENTITY-SCHEMA-V1
// Canonical geographic registry shared by SEO/Search/Map adapters.
// Only entities with validation_status="validated" and seo_eligible=true may
// generate controlled SEO pages. Aliases absorb accents/transliterations so
// ingestion labels do not create duplicate geographic entities.

export type GeoValidationStatus = "validated" | "pending_review";
export type CanonicalCitySlug =
  | "casablanca"
  | "rabat"
  | "marrakech"
  | "tanger"
  | "agadir"
  | "fes"
  | "kenitra"
  | "mohammedia"
  | "sale"
  | "temara"
  | "meknes"
  | "tetouan"
  | "oujda"
  | "el-jadida"
  | "nador"
  | "essaouira"
  | "bouskoura"
  | "bouznika"
  | "azrou";

export type CanonicalCityEntity = {
  id: string;
  slug: CanonicalCitySlug;
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
  city_slug: CanonicalCitySlug;
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
  { id: "city_fes", slug: "fes", canonical_name: "Fès", aliases: ["Fes"], validation_status: "validated", seo_eligible: false },
  { id: "city_kenitra", slug: "kenitra", canonical_name: "Kénitra", aliases: ["Kenitra"], validation_status: "validated", seo_eligible: false },
  { id: "city_mohammedia", slug: "mohammedia", canonical_name: "Mohammedia", aliases: [], validation_status: "validated", seo_eligible: false },
  { id: "city_sale", slug: "sale", canonical_name: "Salé", aliases: ["Sale"], validation_status: "validated", seo_eligible: false },
  { id: "city_temara", slug: "temara", canonical_name: "Témara", aliases: ["Temara"], validation_status: "validated", seo_eligible: false },
  { id: "city_meknes", slug: "meknes", canonical_name: "Meknès", aliases: ["Meknes"], validation_status: "validated", seo_eligible: false },
  { id: "city_tetouan", slug: "tetouan", canonical_name: "Tétouan", aliases: ["Tetouan"], validation_status: "validated", seo_eligible: false },
  { id: "city_oujda", slug: "oujda", canonical_name: "Oujda", aliases: [], validation_status: "validated", seo_eligible: false },
  { id: "city_el_jadida", slug: "el-jadida", canonical_name: "El Jadida", aliases: ["El-Jadida"], validation_status: "validated", seo_eligible: false },
  { id: "city_nador", slug: "nador", canonical_name: "Nador", aliases: [], validation_status: "validated", seo_eligible: false },
  { id: "city_essaouira", slug: "essaouira", canonical_name: "Essaouira", aliases: [], validation_status: "validated", seo_eligible: false },
  { id: "city_bouskoura", slug: "bouskoura", canonical_name: "Bouskoura", aliases: [], validation_status: "validated", seo_eligible: false },
  { id: "city_bouznika", slug: "bouznika", canonical_name: "Bouznika", aliases: [], validation_status: "validated", seo_eligible: false },
  { id: "city_azrou", slug: "azrou", canonical_name: "Azrou", aliases: [], validation_status: "validated", seo_eligible: false },
];

export const GEO_NEIGHBORHOODS: CanonicalNeighborhoodEntity[] = [
  // Casablanca
  { id: "district_casablanca_maarif", slug: "maarif", canonical_name: "Maârif", aliases: ["Maarif"], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_casablanca_racine", slug: "racine", canonical_name: "Racine", aliases: [], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_casablanca_ain_diab", slug: "ain-diab", canonical_name: "Aïn Diab", aliases: ["Ain Diab"], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_casablanca_bourgogne", slug: "bourgogne", canonical_name: "Bourgogne", aliases: [], city_slug: "casablanca", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_casablanca_finance_city", slug: "finance-city", canonical_name: "Casablanca Finance City", aliases: ["Finance City", "CFC"], city_slug: "casablanca", validation_status: "validated", seo_eligible: false, map_eligible: true },
  // Official Casablanca sources identify Hay Hassani as an arrondissement and Sidi Maârouf / Californie as named Ain Chock zones.
  // Identity only: no product boundary is implied by these registry entries.
  { id: "district_casablanca_hay_hassani", slug: "hay-hassani", canonical_name: "Hay Hassani", aliases: ["Hay El Hassani"], city_slug: "casablanca", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_casablanca_sidi_maarouf", slug: "sidi-maarouf", canonical_name: "Sidi Maârouf", aliases: ["Sidi Maarouf"], city_slug: "casablanca", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_casablanca_californie", slug: "californie", canonical_name: "Californie", aliases: ["California"], city_slug: "casablanca", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_casablanca_bouskoura", slug: "bouskoura", canonical_name: "Bouskoura", aliases: [], city_slug: "casablanca", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Rabat
  { id: "district_rabat_agdal", slug: "agdal", canonical_name: "Agdal", aliases: [], city_slug: "rabat", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_rabat_souissi", slug: "souissi", canonical_name: "Souissi", aliases: [], city_slug: "rabat", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_rabat_hay_riad", slug: "hay-riad", canonical_name: "Hay Riad", aliases: ["Hay Ryad", "Riad"], city_slug: "rabat", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_rabat_hassan", slug: "hassan", canonical_name: "Hassan", aliases: [], city_slug: "rabat", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_rabat_ocean", slug: "ocean", canonical_name: "Océan", aliases: ["Ocean"], city_slug: "rabat", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Salé — identity-only product geography. Official PA/arrondissement geometry is not a product boundary.
  { id: "district_sale_bab_lamrissa", slug: "bab-lamrissa", canonical_name: "Bab Lamrissa", aliases: ["Bab Lemrissa"], city_slug: "sale", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_sale_tabriquet", slug: "tabriquet", canonical_name: "Tabriquet", aliases: [], city_slug: "sale", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_sale_bettana", slug: "bettana", canonical_name: "Bettana", aliases: [], city_slug: "sale", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_sale_laayayda", slug: "laayayda", canonical_name: "Laayayda", aliases: ["Layayda"], city_slug: "sale", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_sale_hssaine", slug: "hssaine", canonical_name: "Hssaine", aliases: ["Hssain", "Hssaïne"], city_slug: "sale", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Témara — identity-only product geography. No tax/planning zone is treated as a product boundary.
  { id: "district_temara_hay_al_wifaq", slug: "hay-al-wifaq", canonical_name: "Hay Al Wifaq", aliases: ["Al Wifaq", "El Wifaq", "Wifak"], city_slug: "temara", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_temara_ibnou_rochd", slug: "ibnou-rochd", canonical_name: "Ibnou Rochd", aliases: ["Ibn Rochd", "Ibn Roched"], city_slug: "temara", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_temara_massira_1", slug: "massira-1", canonical_name: "Massira I", aliases: ["Massira 1", "Al Massira I"], city_slug: "temara", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_temara_hay_al_maghreb_al_arabi", slug: "hay-al-maghreb-al-arabi", canonical_name: "Hay Al Maghreb Al Arabi", aliases: ["Maghreb Al Arabi", "Hay Maghrib Al Arabi"], city_slug: "temara", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_temara_oulad_mtaa", slug: "oulad-mtaa", canonical_name: "Oulad Mtaa", aliases: ["Oulad Mtâa", "Ouled Mtaa", "Ouled Metaâ"], city_slug: "temara", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Marrakech
  { id: "district_marrakech_gueliz", slug: "gueliz", canonical_name: "Guéliz", aliases: ["Gueliz"], city_slug: "marrakech", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_marrakech_hivernage", slug: "hivernage", canonical_name: "Hivernage", aliases: ["L'Hivernage"], city_slug: "marrakech", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_marrakech_ourika", slug: "route-de-lourika", canonical_name: "Route de l'Ourika", aliases: ["Ourika", "Route Ourika"], city_slug: "marrakech", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Tanger
  { id: "district_tanger_malabata", slug: "malabata", canonical_name: "Malabata", aliases: [], city_slug: "tanger", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_tanger_ville_nouvelle", slug: "ville-nouvelle", canonical_name: "Ville Nouvelle", aliases: ["Ville nouvelle"], city_slug: "tanger", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_tanger_marchan", slug: "marchan", canonical_name: "Marchan", aliases: ["Marshan"], city_slug: "tanger", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Agadir
  { id: "district_agadir_founty", slug: "founty", canonical_name: "Founty", aliases: [], city_slug: "agadir", validation_status: "validated", seo_eligible: true, map_eligible: true },
  { id: "district_agadir_talborjt", slug: "talborjt", canonical_name: "Talborjt", aliases: ["Quartier Talborjt"], city_slug: "agadir", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Meknès — identity-only product geography. No DGI zone is a product boundary.
  { id: "district_meknes_ancienne_medina", slug: "ancienne-medina", canonical_name: "Ancienne Médina", aliases: ["Ancienne Medina", "Medina"], city_slug: "meknes", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_meknes_hamria", slug: "hamria", canonical_name: "Hamria", aliases: ["Hamria Centre"], city_slug: "meknes", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_meknes_marjane", slug: "marjane", canonical_name: "Marjane", aliases: [], city_slug: "meknes", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_meknes_ryad", slug: "ryad", canonical_name: "Ryad", aliases: ["Riad"], city_slug: "meknes", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_meknes_zitoune", slug: "zitoune", canonical_name: "Zitoune", aliases: [], city_slug: "meknes", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Tétouan — identity-only product geography. UNESCO heritage geometry is not a product boundary.
  { id: "district_tetouan_medina", slug: "medina", canonical_name: "Médina", aliases: ["Medina"], city_slug: "tetouan", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_tetouan_ensanche", slug: "ensanche", canonical_name: "Ensanche", aliases: ["El Ensanche"], city_slug: "tetouan", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Oujda — identity-only product geography. No tax/planning zone is a product boundary.
  { id: "district_oujda_centre_ville", slug: "centre-ville", canonical_name: "Centre Ville", aliases: ["Centre-ville"], city_slug: "oujda", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_oujda_hay_al_massira", slug: "hay-al-massira", canonical_name: "Hay Al Massira", aliases: ["Hay Massira"], city_slug: "oujda", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_oujda_hay_boudir", slug: "hay-boudir", canonical_name: "Hay Boudir", aliases: ["Boudir"], city_slug: "oujda", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_oujda_hay_al_andalous", slug: "hay-al-andalous", canonical_name: "Hay Al Andalous", aliases: ["Hay Andalous"], city_slug: "oujda", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_oujda_hay_el_qods", slug: "hay-el-qods", canonical_name: "Hay El Qods", aliases: ["Hay Qods", "Hay Al Qods"], city_slug: "oujda", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // El Jadida — identity-only product geography. DGI zones are not product boundaries.
  { id: "district_el_jadida_hay_salam", slug: "hay-salam", canonical_name: "Hay Salam", aliases: ["Hay Essalam"], city_slug: "el-jadida", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_el_jadida_najd", slug: "najd", canonical_name: "Najd", aliases: ["Hay Najd"], city_slug: "el-jadida", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_el_jadida_plateau", slug: "plateau", canonical_name: "Plateau", aliases: [], city_slug: "el-jadida", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_el_jadida_sidi_moussa", slug: "sidi-moussa", canonical_name: "Sidi Moussa", aliases: [], city_slug: "el-jadida", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_el_jadida_al_boustane", slug: "al-boustane", canonical_name: "Al Boustane", aliases: ["El Boustane"], city_slug: "el-jadida", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Nador — identity-only product geography.
  { id: "district_nador_oulad_mimoun", slug: "oulad-mimoun", canonical_name: "Oulad Mimoun", aliases: ["Ouled Mimoun"], city_slug: "nador", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_nador_hay_al_matar", slug: "hay-al-matar", canonical_name: "Hay Al Matar", aliases: ["Quartier Al Matar"], city_slug: "nador", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_nador_hay_aarid", slug: "hay-aarid", canonical_name: "Hay Aarid", aliases: ["Arrid", "Arred"], city_slug: "nador", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Essaouira — identity-only product geography. UNESCO heritage geometry is not a product boundary.
  { id: "district_essaouira_medina", slug: "medina", canonical_name: "Médina", aliases: ["Medina"], city_slug: "essaouira", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_essaouira_kasbah", slug: "kasbah", canonical_name: "Kasbah", aliases: ["Kasba"], city_slug: "essaouira", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Bouznika — identity-only product geography. DGI zones are not product boundaries.
  { id: "district_bouznika_hay_salim", slug: "hay-salim", canonical_name: "Hay Salim", aliases: ["Lot Salim"], city_slug: "bouznika", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_bouznika_hay_ghita", slug: "hay-ghita", canonical_name: "Hay Ghita", aliases: ["Lot Ghita"], city_slug: "bouznika", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_bouznika_hay_riad", slug: "hay-riad", canonical_name: "Hay Riad", aliases: ["Hay Ryad"], city_slug: "bouznika", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_bouznika_al_wouroud", slug: "al-wouroud", canonical_name: "Al Wouroud", aliases: ["El Wouroud", "Lot El Woroud"], city_slug: "bouznika", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_bouznika_hay_amal", slug: "hay-amal", canonical_name: "Hay Amal", aliases: ["Hay El Amal"], city_slug: "bouznika", validation_status: "validated", seo_eligible: false, map_eligible: true },

  // Map-only canonical entities: validated for map/navigation, not auto-indexed for SEO.
  { id: "district_fes_ville_nouvelle", slug: "ville-nouvelle", canonical_name: "Ville Nouvelle", aliases: [], city_slug: "fes", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_fes_el_bali", slug: "fes-el-bali", canonical_name: "Fès el-Bali", aliases: ["Fes el-Bali", "Fes el Bali"], city_slug: "fes", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_kenitra_centre_ville", slug: "centre-ville", canonical_name: "Centre-ville", aliases: ["Centre ville"], city_slug: "kenitra", validation_status: "validated", seo_eligible: false, map_eligible: true },
  { id: "district_mohammedia_centre", slug: "centre", canonical_name: "Centre", aliases: ["Centre-ville", "Centre ville"], city_slug: "mohammedia", validation_status: "validated", seo_eligible: false, map_eligible: true },
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

export function canonicalizeGeoPair(city: string, neighborhood?: string | null): { city: string; neighborhood?: string } {
  const canonicalCity = canonicalizeCityName(city);
  if (!neighborhood?.trim()) return { city: canonicalCity };
  return {
    city: canonicalCity,
    neighborhood: canonicalizeNeighborhoodName(canonicalCity, neighborhood),
  };
}

/**
 * Returns the canonical name plus accepted raw aliases for read-model matching.
 * This is intentionally identity-only: it does not make an entity SEO eligible.
 */
export function getCitySearchVariants(value: string): string[] {
  const entity = resolveCityEntity(value);
  if (!entity) return [value.trim()].filter(Boolean);
  return Array.from(new Set([entity.canonical_name, ...entity.aliases]));
}

export function getValidatedSeoCities(): CanonicalCityEntity[] {
  return GEO_CITIES.filter((city) => city.validation_status === "validated" && city.seo_eligible);
}

export function getValidatedSeoNeighborhoods(citySlug?: CanonicalCitySlug): CanonicalNeighborhoodEntity[] {
  return GEO_NEIGHBORHOODS.filter(
    (district) =>
      district.validation_status === "validated" &&
      district.seo_eligible &&
      (!citySlug || district.city_slug === citySlug),
  );
}

export function getValidatedMapNeighborhoods(): CanonicalNeighborhoodEntity[] {
  return GEO_NEIGHBORHOODS.filter(
    (district) => district.validation_status === "validated" && district.map_eligible,
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
