// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 10, 13-15.
// Nationally-scoped city/district text extraction, following the exact same
// normalize-then-alias-match algorithm as utils.ts's extractCity/
// extractDistrict (3 cities only) — just fed from national-geography.ts's
// full 16-city / 65-district set instead. Kept as a separate module so
// classify.ts's original functions (and the locked pilot behavior that
// depends on them) are never edited.

import { ALL_CITIES, TIER_3_DISTRICTS } from "./national-geography";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// City aliases: the canonical name itself, normalized, plus a small set of
// well-known alternate spellings already used elsewhere in this codebase
// (scripts/scrapers/normalizers/normalize-city.ts) — never invented.
const NATIONAL_CITY_ALIASES: ReadonlyArray<{ city: string; aliases: string[] }> = [
  { city: "Casablanca", aliases: ["casablanca", "casa", "dar el beida"] },
  { city: "Rabat", aliases: ["rabat"] },
  { city: "Salé", aliases: ["sale", "sla"] },
  { city: "Témara", aliases: ["temara"] },
  { city: "Marrakech", aliases: ["marrakech", "marrakesh"] },
  { city: "Tanger", aliases: ["tanger", "tangier"] },
  { city: "Agadir", aliases: ["agadir"] },
  { city: "Fès", aliases: ["fes", "fez"] },
  { city: "Meknès", aliases: ["meknes"] },
  { city: "Kénitra", aliases: ["kenitra"] },
  { city: "El Jadida", aliases: ["el jadida", "eljadida"] },
  { city: "Oujda", aliases: ["oujda"] },
  { city: "Tétouan", aliases: ["tetouan"] },
  { city: "Nador", aliases: ["nador"] },
  { city: "Mohammedia", aliases: ["mohammedia"] },
  { city: "Essaouira", aliases: ["essaouira"] },
];

const NATIONAL_DISTRICT_ALIASES: ReadonlyArray<{ city: string; district: string; aliases: string[] }> = Object.entries(
  TIER_3_DISTRICTS,
).flatMap(([city, districts]) =>
  districts.map((district) => ({
    city,
    district,
    aliases: [normalizeText(district)],
  })),
);

export function extractCityNational(value: string): string | null {
  const normalized = normalizeText(value);
  for (const entry of NATIONAL_CITY_ALIASES) {
    if (entry.aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return entry.city;
    }
  }
  return null;
}

export function extractDistrictNational(value: string): { city: string; district: string } | null {
  const normalized = normalizeText(value);
  for (const entry of NATIONAL_DISTRICT_ALIASES) {
    if (entry.aliases.some((alias) => normalized.includes(alias))) {
      return { city: entry.city, district: entry.district };
    }
  }
  return null;
}

export function isKnownNationalCity(city: string | null): boolean {
  return city != null && ALL_CITIES.includes(city);
}
