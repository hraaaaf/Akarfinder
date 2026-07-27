import { listMarketBenchmarkEntries, normalizeMarketBenchmarkPropertyType } from "@/lib/market/market-benchmark-registry";

export type ExplorerCity = {
  city: string;
  publishedZoneCount: number;
  cityReferencePricePerM2: number | null;
  minNeighborhoodPricePerM2: number | null;
  maxNeighborhoodPricePerM2: number | null;
};

export type ExplorerNeighborhood = {
  neighborhood: string;
  pricePerM2: number;
  sourceUrl: string;
  observedAt: string;
};

export type CityNeighborhoodExplorerModel = {
  status: "available" | "unavailable";
  propertyType: string;
  selectedCity: string | null;
  selectedNeighborhood: string | null;
  cities: ExplorerCity[];
  neighborhoods: ExplorerNeighborhood[];
  disclosure: string;
  reason: string | null;
};

const DISCLOSURE =
  "Navigation fondée uniquement sur les références publiques disponibles. Une zone absente signifie qu’aucune référence publiable n’est disponible, pas qu’elle est moins chère, moins attractive ou inactive.";

export function buildCityNeighborhoodExplorerModel(input: {
  propertyType: string;
  selectedCity?: string | null;
  selectedNeighborhood?: string | null;
}): CityNeighborhoodExplorerModel {
  const propertyType = normalizeMarketBenchmarkPropertyType(input.propertyType);
  if (!propertyType) {
    return {
      status: "unavailable",
      propertyType: input.propertyType,
      selectedCity: null,
      selectedNeighborhood: null,
      cities: [],
      neighborhoods: [],
      disclosure: DISCLOSURE,
      reason: "L’exploration couvre actuellement les appartements et les villas.",
    };
  }

  const entries = listMarketBenchmarkEntries().filter(
    (entry) =>
      entry.property_type === propertyType &&
      entry.benchmark_price_per_m2 > 0 &&
      Boolean(entry.source_url) &&
      Boolean(entry.benchmark_observed_at),
  );

  const cityNames = [...new Set(entries.map((entry) => entry.city).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );

  const cities = cityNames.map((city) => {
    const scoped = entries.filter((entry) => entry.city === city);
    const cityEntry = scoped.find((entry) => entry.scope === "city") ?? null;
    const neighborhoodValues = scoped
      .filter((entry) => entry.scope === "neighborhood")
      .map((entry) => entry.benchmark_price_per_m2);
    return {
      city,
      publishedZoneCount: neighborhoodValues.length,
      cityReferencePricePerM2: cityEntry?.benchmark_price_per_m2 ?? null,
      minNeighborhoodPricePerM2: neighborhoodValues.length ? Math.min(...neighborhoodValues) : null,
      maxNeighborhoodPricePerM2: neighborhoodValues.length ? Math.max(...neighborhoodValues) : null,
    } satisfies ExplorerCity;
  });

  const selectedCity = input.selectedCity && input.selectedCity !== "all" ? input.selectedCity : null;
  const neighborhoods = selectedCity
    ? entries
        .filter((entry) => entry.city.toLowerCase() === selectedCity.toLowerCase() && entry.scope === "neighborhood" && entry.neighborhood)
        .map((entry) => ({
          neighborhood: entry.neighborhood!,
          pricePerM2: entry.benchmark_price_per_m2,
          sourceUrl: entry.source_url!,
          observedAt: entry.benchmark_observed_at!,
        }))
        .sort((a, b) => a.neighborhood.localeCompare(b.neighborhood, "fr"))
    : [];

  return {
    status: cities.length ? "available" : "unavailable",
    propertyType,
    selectedCity,
    selectedNeighborhood: input.selectedNeighborhood ?? null,
    cities,
    neighborhoods,
    disclosure: DISCLOSURE,
    reason: cities.length ? null : "Aucune référence publiable n’est disponible pour ce type de bien.",
  };
}

export function cityNeighborhoodExplorerChangesRanking(): false {
  return false;
}
