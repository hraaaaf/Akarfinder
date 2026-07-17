// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 10.
// National city/district taxonomy for the query planner. There is no single
// canonical taxonomy module in this codebase (confirmed by direct audit of
// lib/cities.ts, lib/seo-city-pages, lib/geo/district-dictionary.ts,
// lib/search/city-coords.ts, scripts/scrapers/normalizers/normalize-city.ts):
// each covers a different, partially-overlapping subset. Tier 1 below is the
// mission's own explicit 15-city list (verbatim). Tier 2 is the union of
// every other city name AkarFinder's codebase already recognizes anywhere
// (city-coords.ts), minus Tier 1 — deliberately NOT expanded beyond what the
// project already recognizes, per the "never invent data" rule. Tier 3
// (districts) reuses lib/geo/district-dictionary.ts's MOROCCO_DISTRICTS
// as-is — the only 6 cities with real, already-vetted district data. The
// mission's Tier-3 target list also names Salé, Témara, Meknès, Kénitra, but
// no district-level data exists for them anywhere in the codebase; rather
// than invent neighborhood names, Tier 3 for those 4 cities is intentionally
// absent (documented here, not silently dropped).

export const TIER_1_CITIES: readonly string[] = [
  "Casablanca",
  "Rabat",
  "Salé",
  "Témara",
  "Marrakech",
  "Tanger",
  "Agadir",
  "Fès",
  "Meknès",
  "Kénitra",
  "El Jadida",
  "Oujda",
  "Tétouan",
  "Nador",
  "Mohammedia",
];

// city-coords.ts's full recognized set, minus Tier 1 (case/accent-insensitive
// comparison). Only "Essaouira" survives the subtraction.
export const TIER_2_CITIES: readonly string[] = ["Essaouira"];

export const ALL_CITIES: readonly string[] = [...TIER_1_CITIES, ...TIER_2_CITIES];

// Reused verbatim from lib/geo/district-dictionary.ts (LISTING-DISTRICT-RECOVERY-1)
// — the only district-level data this project has ever vetted. Not
// duplicated by import to keep this module dependency-free and independently
// testable; kept in sync manually (both files are small and stable).
export const TIER_3_DISTRICTS: Readonly<Record<string, readonly string[]>> = {
  Rabat: [
    "Agdal", "Hay Riad", "Souissi", "Hassan", "Océan",
    "Les Orangers", "Aviation", "Akkari", "Yacoub El Mansour", "Medina",
  ],
  Casablanca: [
    "Maarif", "Gauthier", "Racine", "Bourgogne", "Anfa", "Californie",
    "Ain Diab", "Sidi Maarouf", "Oasis", "Palmier", "Finance City",
    "CIL", "Beauséjour", "Derb Ghallef", "Belvédère", "Ain Sebaa", "Roches Noires",
  ],
  Marrakech: [
    "Guéliz", "Hivernage", "Palmeraie", "Targa", "Route de l'Ourika",
    "Route de Fès", "Majorelle", "Agdal", "Mhamid", "Massira", "Medina",
  ],
  Agadir: [
    "Founty", "Talborjt", "Haut Founty", "Hay Mohammadi", "Dakhla",
    "Sonaba", "Charaf", "Cité Suisse", "Bensergao",
  ],
  Tanger: [
    "Malabata", "Iberia", "Nejma", "Centre-ville", "Marshan",
    "Californie", "Val Fleuri", "Moujahidine", "Boubana", "Achakar",
  ],
  Fès: [
    "Agdal", "Ville Nouvelle", "Saiss", "Narjis", "Atlas",
    "Route d'Imouzzer", "Medina", "Champs de Course",
  ],
};

export const TIER_3_CITIES_WITHOUT_DISTRICT_DATA: readonly string[] = [
  "Salé",
  "Témara",
  "Meknès",
  "Kénitra",
];

// Standard, factual Arabic names for the Tier 1/2 cities (objective
// geographic knowledge, not invented business data — the same status as
// knowing "Morocco" is "المغرب"). Used only to generate Arabic-language
// query text (section 10.D); never displayed publicly, never stored as a
// listing attribute.
export const CITY_ARABIC_NAMES: Readonly<Record<string, string>> = {
  Casablanca: "الدار البيضاء",
  Rabat: "الرباط",
  "Salé": "سلا",
  "Témara": "تمارة",
  Marrakech: "مراكش",
  Tanger: "طنجة",
  Agadir: "أكادير",
  "Fès": "فاس",
  "Meknès": "مكناس",
  "Kénitra": "القنيطرة",
  "El Jadida": "الجديدة",
  Oujda: "وجدة",
  "Tétouan": "تطوان",
  Nador: "الناظور",
  Mohammedia: "المحمدية",
  Essaouira: "الصويرة",
};

// Standard, factual Arabic translations of the 12 query property-type labels
// (objective vocabulary knowledge, same status as the city names above — not
// invented business data). Used so an "ar" query is fully, grammatically
// Arabic rather than a French/Arabic hybrid (a hybrid like "terrain كراء
// مراكش" was found, during this mission's own live smoke test, to return
// zero relevant engine results — see docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md).
export const PROPERTY_TYPE_ARABIC_NAMES: Readonly<Record<string, string>> = {
  "appartement": "شقة",
  "studio": "استوديو",
  "villa": "فيلا",
  "maison": "منزل",
  "terrain": "أرض",
  "riad": "رياض",
  "bureau": "مكتب",
  "local commercial": "محل تجاري",
  "magasin": "متجر",
  "ferme": "مزرعة",
  "immeuble": "عمارة",
  "duplex": "دوبلكس",
};

export function getDistrictsForCity(city: string): readonly string[] {
  return TIER_3_DISTRICTS[city] ?? [];
}

export function getCityTier(city: string): 1 | 2 | 3 | null {
  if (TIER_1_CITIES.includes(city)) return 1;
  if (TIER_2_CITIES.includes(city)) return 2;
  return null;
}

export function isRecognizedCity(city: string): boolean {
  return ALL_CITIES.includes(city);
}
