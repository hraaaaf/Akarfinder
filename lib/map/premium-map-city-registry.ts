export type PremiumMapMarketIntelligenceProvider = "rabat-market-intelligence";

export type PremiumMapCityCapability = {
  slug: "casablanca" | "rabat" | "marrakech" | "tanger" | "agadir" | "fes";
  displayName: "Casablanca" | "Rabat" | "Marrakech" | "Tanger" | "Agadir" | "Fès";
  order: number;
  explore: true;
  marketIntelligenceProvider: PremiumMapMarketIntelligenceProvider | null;
};

export const PREMIUM_MAP_CITIES = [
  { slug: "casablanca", displayName: "Casablanca", order: 1, explore: true, marketIntelligenceProvider: null },
  { slug: "rabat", displayName: "Rabat", order: 2, explore: true, marketIntelligenceProvider: "rabat-market-intelligence" },
  { slug: "marrakech", displayName: "Marrakech", order: 3, explore: true, marketIntelligenceProvider: null },
  { slug: "tanger", displayName: "Tanger", order: 4, explore: true, marketIntelligenceProvider: null },
  { slug: "agadir", displayName: "Agadir", order: 5, explore: true, marketIntelligenceProvider: null },
  { slug: "fes", displayName: "Fès", order: 6, explore: true, marketIntelligenceProvider: null },
] as const satisfies readonly PremiumMapCityCapability[];

export type PremiumMapCitySlug = (typeof PREMIUM_MAP_CITIES)[number]["slug"];

export function getPremiumMapCity(slug: string | undefined) {
  if (!slug) return null;
  return PREMIUM_MAP_CITIES.find((city) => city.slug === slug) ?? null;
}

export function getPremiumMarketIntelligenceProvider(
  slug: string | undefined,
): PremiumMapMarketIntelligenceProvider | null {
  return getPremiumMapCity(slug)?.marketIntelligenceProvider ?? null;
}
