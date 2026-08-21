export const CITY_TERRITORIAL_COLOR_MEANING = "identity-only" as const;

export const CITY_TERRITORIAL_COLORS = [
  { slug: "casablanca", displayName: "Casablanca", color: "#2563EB", soft: "#EFF6FF" },
  { slug: "rabat", displayName: "Rabat", color: "#0F766E", soft: "#ECFDF5" },
  { slug: "marrakech", displayName: "Marrakech", color: "#C2410C", soft: "#FFF7ED" },
  { slug: "tanger", displayName: "Tanger", color: "#7C3AED", soft: "#F5F3FF" },
  { slug: "agadir", displayName: "Agadir", color: "#15803D", soft: "#F0FDF4" },
  { slug: "fes", displayName: "Fès", color: "#BE123C", soft: "#FFF1F2" },
] as const;

export type CityTerritorialColor = (typeof CITY_TERRITORIAL_COLORS)[number];

function normalizeCityColorKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getCityTerritorialColor(value: string): CityTerritorialColor | null {
  const normalized = normalizeCityColorKey(value);
  return CITY_TERRITORIAL_COLORS.find((entry) =>
    normalizeCityColorKey(entry.slug) === normalized ||
    normalizeCityColorKey(entry.displayName) === normalized
  ) ?? null;
}

export function findCityTerritorialColorInText(value: string): CityTerritorialColor | null {
  const normalized = normalizeCityColorKey(value);
  return CITY_TERRITORIAL_COLORS.find((entry) =>
    normalized.includes(normalizeCityColorKey(entry.displayName))
  ) ?? null;
}
