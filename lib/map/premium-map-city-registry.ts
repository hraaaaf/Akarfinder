export type PremiumMapCityCapability = {
  slug: "casablanca" | "rabat" | "marrakech" | "tanger" | "agadir" | "fes";
  displayName: "Casablanca" | "Rabat" | "Marrakech" | "Tanger" | "Agadir" | "Fès";
  order: number;
  explore: true;
  marketIntelligence: boolean;
};

export const PREMIUM_MAP_CITIES = [
  { slug: "casablanca", displayName: "Casablanca", order: 1, explore: true, marketIntelligence: false },
  { slug: "rabat", displayName: "Rabat", order: 2, explore: true, marketIntelligence: true },
  { slug: "marrakech", displayName: "Marrakech", order: 3, explore: true, marketIntelligence: false },
  { slug: "tanger", displayName: "Tanger", order: 4, explore: true, marketIntelligence: false },
  { slug: "agadir", displayName: "Agadir", order: 5, explore: true, marketIntelligence: false },
  { slug: "fes", displayName: "Fès", order: 6, explore: true, marketIntelligence: false },
] as const satisfies readonly PremiumMapCityCapability[];

export type PremiumMapCitySlug = (typeof PREMIUM_MAP_CITIES)[number]["slug"];

export function getPremiumMapCity(slug: string | undefined) {
  if (!slug) return null;
  return PREMIUM_MAP_CITIES.find((city) => city.slug === slug) ?? null;
}

export function hasPremiumMarketIntelligence(slug: string | undefined): boolean {
  return getPremiumMapCity(slug)?.marketIntelligence === true;
}
