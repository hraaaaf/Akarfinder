import { listMarketBenchmarkEntries, normalizeMarketBenchmarkPropertyType } from "@/lib/market/market-benchmark-registry";

export type CertifiedHeatmapZone = {
  key: string;
  city: string;
  neighborhood: string | null;
  scope: "city" | "neighborhood";
  pricePerM2: number;
  relativeIndex: number;
  band: "lowest" | "lower" | "middle" | "higher" | "highest";
  sourceUrl: string;
  observedAt: string;
};

export type CertifiedLocalHeatmapModel = {
  status: "available" | "unavailable";
  city: string;
  propertyType: string;
  zones: CertifiedHeatmapZone[];
  minPricePerM2: number | null;
  maxPricePerM2: number | null;
  disclosure: string;
  reason: string | null;
};

const DISCLOSURE = "Couleurs relatives aux références publiques de prix demandé disponibles pour ce périmètre. Elles ne mesurent ni la demande, ni la liquidité, ni une performance future.";

function bandFor(index: number): CertifiedHeatmapZone["band"] {
  if (index <= 0.2) return "lowest";
  if (index <= 0.4) return "lower";
  if (index <= 0.6) return "middle";
  if (index <= 0.8) return "higher";
  return "highest";
}

export function buildCertifiedLocalHeatmapModel(input: {
  city: string;
  propertyType: string;
}): CertifiedLocalHeatmapModel {
  const propertyType = normalizeMarketBenchmarkPropertyType(input.propertyType);
  if (input.city === "all" || !propertyType) {
    return {
      status: "unavailable",
      city: input.city,
      propertyType: input.propertyType,
      zones: [],
      minPricePerM2: null,
      maxPricePerM2: null,
      disclosure: DISCLOSURE,
      reason: input.city === "all" ? "Choisissez une ville pour afficher les zones couvertes." : "La carte couvre actuellement les appartements et les villas.",
    };
  }

  const entries = listMarketBenchmarkEntries().filter((entry) =>
    entry.city.toLowerCase() === input.city.toLowerCase() &&
    entry.property_type === propertyType &&
    entry.benchmark_price_per_m2 > 0 &&
    Boolean(entry.source_url) &&
    Boolean(entry.benchmark_observed_at),
  );

  if (entries.length === 0) {
    return {
      status: "unavailable",
      city: input.city,
      propertyType,
      zones: [],
      minPricePerM2: null,
      maxPricePerM2: null,
      disclosure: DISCLOSURE,
      reason: "Aucune zone publiable n’est disponible pour cette combinaison.",
    };
  }

  const values = entries.map((entry) => entry.benchmark_price_per_m2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;

  const zones = entries
    .map((entry) => {
      const relativeIndex = spread === 0 ? 0.5 : (entry.benchmark_price_per_m2 - min) / spread;
      return {
        key: `${entry.city}:${entry.neighborhood ?? "city"}:${entry.property_type}`,
        city: entry.city,
        neighborhood: entry.neighborhood,
        scope: entry.scope,
        pricePerM2: entry.benchmark_price_per_m2,
        relativeIndex,
        band: bandFor(relativeIndex),
        sourceUrl: entry.source_url!,
        observedAt: entry.benchmark_observed_at!,
      } satisfies CertifiedHeatmapZone;
    })
    .sort((a, b) => b.pricePerM2 - a.pricePerM2);

  return {
    status: "available",
    city: input.city,
    propertyType,
    zones,
    minPricePerM2: min,
    maxPricePerM2: max,
    disclosure: DISCLOSURE,
    reason: null,
  };
}

export function certifiedLocalHeatmapChangesRanking(): false {
  return false;
}
