// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 10, 13-15.
// DATA-FUNNEL-RECOVERY-1
//
// Nationally-scoped city/district extraction for acquisition. Query Universe V2
// now covers the full acquisition geography, so extraction must use the same
// city set or otherwise newly-added national queries silently fall back to the
// query city without being independently recognized in result text.
// Arabic aliases are additive and come from the same canonical geography file
// used to generate Arabic queries; no city/district is invented here.

import {
  ALL_ACQUISITION_CITIES,
  CITY_ARABIC_NAMES,
  TIER_3_DISTRICTS,
} from "./national-geography";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EXTRA_CITY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  Casablanca: ["casa", "dar el beida"],
  Marrakech: ["marrakesh"],
  Tanger: ["tangier"],
  "Fès": ["fez"],
  "Salé": ["sla"],
};

const NATIONAL_CITY_ALIASES: ReadonlyArray<{ city: string; aliases: string[] }> = ALL_ACQUISITION_CITIES.map((city) => {
  const aliases = new Set<string>([normalizeText(city)]);
  for (const alias of EXTRA_CITY_ALIASES[city] ?? []) aliases.add(normalizeText(alias));
  const arabic = CITY_ARABIC_NAMES[city];
  if (arabic) aliases.add(normalizeText(arabic));
  return { city, aliases: [...aliases].filter(Boolean) };
});

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
    if (entry.aliases.some((alias) => alias.length > 0 && normalized.includes(alias))) {
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
  return city != null && ALL_ACQUISITION_CITIES.includes(city);
}
