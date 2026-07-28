import {
  findMarketBenchmark,
  type MarketBenchmarkEntry,
  type MarketBenchmarkPropertyType,
} from "@/lib/market/market-benchmark-registry";

export type PriceExplorerStatus =
  | "available"
  | "unsupported_transaction"
  | "unsupported_property_type"
  | "unpublished"
  | "methodology_missing"
  | "stale";

export type PriceExplorerConfidence = "élevée" | "moyenne" | "faible" | "non publiée";

export type PriceExplorerResult = {
  status: PriceExplorerStatus;
  reason: string | null;
  city: string;
  neighborhood: string | null;
  propertyType: string;
  scope: "city" | "neighborhood" | null;
  askingPricePerM2: number | null;
  currency: "MAD";
  unit: "MAD/m²";
  sourceName: string | null;
  sourceUrl: string | null;
  observedAt: string | null;
  methodology: string | null;
  sampleSize: number | null;
  sampleLabel: string;
  confidence: PriceExplorerConfidence;
  rangeLow: number | null;
  rangeHigh: number | null;
  disclosure: string;
};

const DISCLOSURE =
  "Référence publique agrégée de prix demandé. Ce n’est ni un prix de transaction, ni une estimation certifiée du bien.";

function confidenceFromPublishedSample(sampleSize: number | null): PriceExplorerConfidence {
  if (sampleSize == null) return "non publiée";
  if (sampleSize >= 30) return "élevée";
  if (sampleSize >= 10) return "moyenne";
  return "faible";
}

function publishedRange(entry: MarketBenchmarkEntry): { low: number | null; high: number | null } {
  if (entry.dispersion_pct == null || entry.dispersion_pct <= 0) return { low: null, high: null };
  const ratio = entry.dispersion_pct / 100;
  return {
    low: Math.round(entry.benchmark_price_per_m2 * (1 - ratio)),
    high: Math.round(entry.benchmark_price_per_m2 * (1 + ratio)),
  };
}

function unavailable(
  status: Exclude<PriceExplorerStatus, "available">,
  reason: string,
  city: string,
  neighborhood: string | null,
  propertyType: string,
): PriceExplorerResult {
  return {
    status,
    reason,
    city,
    neighborhood,
    propertyType,
    scope: null,
    askingPricePerM2: null,
    currency: "MAD",
    unit: "MAD/m²",
    sourceName: null,
    sourceUrl: null,
    observedAt: null,
    methodology: null,
    sampleSize: null,
    sampleLabel: "Échantillon non publié",
    confidence: "non publiée",
    rangeLow: null,
    rangeHigh: null,
    disclosure: DISCLOSURE,
  };
}

export function getPriceExplorerResult(input: {
  city: string;
  neighborhood?: string | null;
  propertyType: string;
  transactionType: "all" | "buy" | "rent" | "new";
}): PriceExplorerResult {
  const neighborhood = input.neighborhood && input.neighborhood !== "all" ? input.neighborhood : null;

  if (input.transactionType === "rent") {
    return unavailable(
      "unsupported_transaction",
      "Le référentiel publié disponible couvre la vente, pas la location.",
      input.city,
      neighborhood,
      input.propertyType,
    );
  }

  if (input.city === "all") {
    return unavailable(
      "unpublished",
      "Choisissez une ville pour consulter une référence locale publiée.",
      input.city,
      neighborhood,
      input.propertyType,
    );
  }

  const propertyType = input.propertyType.toLowerCase() as MarketBenchmarkPropertyType;
  if (propertyType !== "appartement" && propertyType !== "villa") {
    return unavailable(
      "unsupported_property_type",
      "Le référentiel public couvre actuellement les appartements et les villas.",
      input.city,
      neighborhood,
      input.propertyType,
    );
  }

  const entry = findMarketBenchmark({
    city: input.city,
    neighborhood,
    property_type: propertyType,
  });

  if (!entry || entry.benchmark_price_per_m2 <= 0 || !entry.source_url) {
    return unavailable(
      "unpublished",
      "Aucune référence publiable n’est disponible pour cette combinaison.",
      input.city,
      neighborhood,
      input.propertyType,
    );
  }

  if (entry.benchmark_method !== "published_aggregated_reference") {
    return unavailable(
      "methodology_missing",
      "La méthodologie de publication n’est pas suffisamment explicite.",
      input.city,
      neighborhood,
      input.propertyType,
    );
  }

  if (!entry.benchmark_observed_at) {
    return unavailable(
      "stale",
      "La date d’observation de la référence n’est pas disponible.",
      input.city,
      neighborhood,
      input.propertyType,
    );
  }

  const range = publishedRange(entry);
  const sampleSize = entry.underlying_sample_size;

  return {
    status: "available",
    reason: null,
    city: entry.city,
    neighborhood: entry.neighborhood,
    propertyType: entry.property_type,
    scope: entry.scope,
    askingPricePerM2: entry.benchmark_price_per_m2,
    currency: "MAD",
    unit: "MAD/m²",
    sourceName: "Yakeey",
    sourceUrl: entry.source_url,
    observedAt: entry.benchmark_observed_at,
    methodology: "Référence agrégée publiée par la source et auditée par AkarFinder.",
    sampleSize,
    sampleLabel: sampleSize == null ? "Échantillon non publié" : `${sampleSize.toLocaleString("fr-MA")} observations publiées`,
    confidence: confidenceFromPublishedSample(sampleSize),
    rangeLow: range.low,
    rangeHigh: range.high,
    disclosure: DISCLOSURE,
  };
}

export function priceExplorerChangesRanking(): false {
  return false;
}
