// Normalize a raw city label to a canonical Moroccan city name.
// Unknown but non-empty values are returned cleaned (title-cased) rather than
// dropped, so we keep data we cannot map yet.

const CITY_ALIASES: Record<string, string> = {
  casa: "Casablanca",
  casablanca: "Casablanca",
  "dar el beida": "Casablanca",
  rabat: "Rabat",
  marrakech: "Marrakech",
  marrakesh: "Marrakech",
  tanger: "Tanger",
  tangier: "Tanger",
  fes: "Fès",
  "fès": "Fès",
  fez: "Fès",
  agadir: "Agadir",
  meknes: "Meknès",
  "meknès": "Meknès",
  kenitra: "Kénitra",
  "kénitra": "Kénitra",
  mohammedia: "Mohammedia",
  oujda: "Oujda",
  tetouan: "Tétouan",
  "tétouan": "Tétouan",
  eljadida: "El Jadida",
  "el jadida": "El Jadida",
};

// Canonical city names we recognise — used to validate breadcrumb candidates.
export const CANONICAL_CITIES = new Set<string>(Object.values(CITY_ALIASES));

export function isCanonicalCity(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const c = normalizeCity(raw);
  return c != null && CANONICAL_CITIES.has(c);
}

function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function normalizeCity(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = String(raw).replace(/ /g, " ").trim();
  if (!s) return null;

  // Keep only the most specific token if "City, District" or "District - City".
  // We try the whole string first, then fall back to parts.
  const key = s.toLowerCase();
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];

  for (const part of s.split(/[,\-–|/]/).map((p) => p.trim())) {
    const pk = part.toLowerCase();
    if (CITY_ALIASES[pk]) return CITY_ALIASES[pk];
  }

  // Unknown city — return a cleaned label.
  return titleCase(s.split(/[,\-–|/]/)[0].trim()) || null;
}
