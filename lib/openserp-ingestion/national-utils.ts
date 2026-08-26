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

const EVIDENCE_BACKED_DISTRICT_ALIASES: ReadonlyArray<{ city: string; district: string; aliases: readonly string[] }> = [
  { city: "Agadir", district: "Marina", aliases: ["marina agadir", "agadir marina"] },
  { city: "Agadir", district: "Amicales", aliases: ["amicales agadir", "agadir amicales"] },
  { city: "Agadir", district: "Riad Salam", aliases: ["riad salam agadir", "agadir riad salam"] },
  { city: "Agadir", district: "Anza", aliases: ["anza agadir", "agadir anza"] },
  { city: "Agadir", district: "Secteur Touristique", aliases: ["secteur touristique agadir", "agadir secteur touristique"] },
  { city: "Agadir", district: "Hay Najah", aliases: ["hay najah agadir", "agadir hay najah"] },
  { city: "Agadir", district: "Tagadirt", aliases: ["tagadirt agadir", "agadir tagadirt"] },
  { city: "Agadir", district: "Cité Adrar", aliases: ["cite adrar agadir", "agadir cite adrar"] },
  { city: "Agadir", district: "Aghroud", aliases: ["aghroud agadir", "agadir aghroud", "aghroud ben serguaou agadir", "aghroud ben sergaou agadir", "aghroud bensergao agadir"] },
  { city: "Agadir", district: "Hay Salam", aliases: ["hay salam agadir", "agadir hay salam"] },
  { city: "Agadir", district: "Al Wifaq", aliases: ["al wifaq agadir", "agadir al wifaq"] },
  { city: "Agadir", district: "Taddart", aliases: ["taddart agadir", "agadir taddart", "taddart anza agadir"] },
  { city: "Agadir", district: "Bensergao", aliases: ["ben serguaou agadir", "ben sergaou agadir", "ben sergua agadir", "agadir ben serguaou"] },
];

const DARAGADIR_STRUCTURED_DISTRICTS: ReadonlyArray<{ district: string; aliases: readonly string[] }> = [
  { district: "El Houda", aliases: ["el houda"] },
  { district: "Centre-ville", aliases: ["centre ville"] },
  { district: "Hay Najah", aliases: ["hay najah"] },
  { district: "Tassila", aliases: ["tassila"] },
  { district: "Hay Al Farah", aliases: ["hay al farah"] },
  { district: "Assaka", aliases: ["assaka"] },
  { district: "Marina", aliases: ["marina dagadir", "marina agadir"] },
  { district: "Hay Zaytoun", aliases: ["hay zaytoun"] },
  { district: "Hay Al Wafa", aliases: ["hay al wafa", "hay al wafaa"] },
  { district: "Dararka", aliases: ["dararka", "darraka"] },
  { district: "Ihchach", aliases: ["ihchach"] },
  { district: "Amsernate", aliases: ["amsernate"] },
  { district: "Lagouira", aliases: ["lagouira", "legouira"] },
  { district: "Hay Hassani", aliases: ["hay hassani"] },
  { district: "Hay Qods", aliases: ["hay qods"] },
  { district: "Agadir Bay", aliases: ["agadir bay"] },
  { district: "Hay Salam", aliases: ["hay salam"] },
  { district: "Aghroud", aliases: ["aghroud"] },
];

const NATIONAL_DISTRICT_ALIASES: ReadonlyArray<{ city: string; district: string; aliases: string[] }> = [
  ...EVIDENCE_BACKED_DISTRICT_ALIASES.map((entry) => ({
    city: entry.city,
    district: entry.district,
    aliases: entry.aliases.map(normalizeText),
  })),
  ...Object.entries(TIER_3_DISTRICTS).flatMap(([city, districts]) =>
    districts.map((district) => ({
      city,
      district,
      aliases: [normalizeText(district)],
    })),
  ),
];

type StructuredDistrictResult =
  | { kind: "match"; city: string; district: string }
  | { kind: "ambiguous" }
  | null;

function humanizeDistrictSlug(value: string): string | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  const cleaned = decoded
    .replace(/[?#].*$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return null;
  if (/^(autre|other|maroc|morocco|vente|location|achat|rent|buy)$/i.test(cleaned)) return null;
  return cleaned
    .split(" ")
    .map((part) => part.length <= 2 ? part.toUpperCase() : `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function decodedPathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function phraseInNormalizedPath(pathname: string, alias: string): boolean {
  const normalizedPath = ` ${normalizeText(decodedPathname(pathname)).replace(/[\/_-]+/g, " ").replace(/\s+/g, " ").trim()} `;
  const normalizedAlias = normalizeText(alias).replace(/[\/_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalizedAlias.length > 0 && normalizedPath.includes(` ${normalizedAlias} `);
}

function extractStructuredPortalDistrict(value: string): StructuredDistrictResult {
  const urls = value.match(/https?:\/\/[^\s]+/gi) ?? [];
  for (const rawUrl of urls) {
    let url: URL;
    try {
      url = new URL(rawUrl.replace(/[),.;]+$/, ""));
    } catch {
      continue;
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname;
    let districtSlug: string | null = null;

    if (host === "agenz.ma") {
      const match = pathname.match(/^\/(?:fr|en)\/annonces\/immo-[^/]+\/(?:vente|location)-[^/]+\/([^/]+)\/\d+\/?$/i);
      districtSlug = match?.[1] ?? null;
    } else if (host === "mouldar.com") {
      const match = pathname.match(/^\/(?:fr|en)\/(?:achat|location|rent|buy)\/[^/]+\/[^/]+\/([^/]+)\/[^/]+\/?$/i);
      districtSlug = match?.[1] ?? null;
    } else if (host === "daragadir.com") {
      const isDetail = /^\/annonces\/annonces-immobilieres\/(?:vente|location|location-de-vacances)\/[^/]+\/[^/]+\.html$/i.test(pathname);
      if (!isDetail || extractCityNational(rawUrl) !== "Agadir") continue;
      const districts = [...new Set(
        DARAGADIR_STRUCTURED_DISTRICTS
          .filter((entry) => entry.aliases.some((alias) => phraseInNormalizedPath(pathname, alias)))
          .map((entry) => entry.district),
      )];
      if (districts.length === 1) return { kind: "match", city: "Agadir", district: districts[0]! };
      if (districts.length > 1) return { kind: "ambiguous" };
      continue;
    }

    if (!districtSlug) continue;
    const city = extractCityNational(rawUrl);
    const district = humanizeDistrictSlug(districtSlug);
    if (city && district) return { kind: "match", city, district };
  }
  return null;
}

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
  const structured = extractStructuredPortalDistrict(value);
  if (structured?.kind === "match") return { city: structured.city, district: structured.district };
  if (structured?.kind === "ambiguous") return null;

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
