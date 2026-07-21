import {
  findMarketBenchmark,
  normalizeMarketBenchmarkPropertyType,
  type MarketBenchmarkMatch,
  type MarketBenchmarkScope,
} from "./market-benchmark-registry";
import {
  calculatePriceGap,
  type PriceGapResult,
  type PricePosition,
} from "./price-gap-calculator";

export const MARKET_INTELLIGENCE_V2_VERSION = "2.0" as const;
export const MARKET_BENCHMARK_CURRENT_MAX_AGE_DAYS = 180;
export const MARKET_BENCHMARK_AGING_MAX_AGE_DAYS = 365;

export type MarketIntelligenceStatus = "evaluated" | "insufficient_data";
export type MarketBenchmarkFreshness = "current" | "aging" | "stale" | "unknown";
export type MarketBenchmarkQuality = "high" | "medium" | "low" | "insufficient";
export type MarketMatchLevel = "exact_neighborhood" | "city_direct" | "city_fallback" | "none";
export type MarketCompatibilityStatus = "compatible" | "limited" | "incompatible" | "unknown";

export type MarketIntelligenceReasonCode =
  | "ok"
  | "missing_offer"
  | "unsupported_property_type"
  | "missing_location"
  | "missing_price"
  | "missing_surface"
  | "invalid_price_or_surface"
  | "rental_benchmark_unavailable"
  | "new_build_segment_benchmark_unavailable"
  | "benchmark_not_found"
  | "benchmark_timestamp_unknown"
  | "benchmark_stale";

export interface MarketIntelligenceV2Input {
  city?: string | null;
  neighborhood?: string | null;
  property_type?: string | null;
  transaction_type?: "sale" | "rent" | null;
  market_segment?: "resale" | "new_build" | "off_plan" | "unknown" | null;
  surface_m2?: number | null;
  asking_price_mad?: number | null;
  generated_at?: string;
}

export interface MarketBenchmarkAssessmentV2 {
  source: "yakeey" | null;
  source_url: string | null;
  reference_kind: "published_aggregated_reference" | null;
  scope: MarketBenchmarkScope | null;
  city: string | null;
  neighborhood: string | null;
  property_type: "appartement" | "villa" | null;
  benchmark_price_per_m2: number | null;
  match_level: MarketMatchLevel;
  fallback_used: boolean;
  observed_at: string | null;
  source_updated_at: string | null;
  age_days: number | null;
  freshness: MarketBenchmarkFreshness;
  underlying_sample_size: number | null;
  dispersion_pct: number | null;
  sample_transparency: "available" | "unknown";
  dispersion_transparency: "available" | "unknown";
  quality: MarketBenchmarkQuality;
}

export interface MarketCompatibilityV2 {
  transaction: MarketCompatibilityStatus;
  property_type: MarketCompatibilityStatus;
  geography: MarketCompatibilityStatus;
  market_segment: MarketCompatibilityStatus;
  surface_segmentation: MarketCompatibilityStatus;
}

export interface MarketIntelligenceV2 {
  version: typeof MARKET_INTELLIGENCE_V2_VERSION;
  status: MarketIntelligenceStatus;
  reason_code: MarketIntelligenceReasonCode;
  explanation: string;
  asking_price: {
    amount_mad: number | null;
    price_per_m2: number | null;
    basis: "asking_price";
  };
  benchmark: MarketBenchmarkAssessmentV2;
  compatibility: MarketCompatibilityV2;
  comparison: {
    position: PricePosition;
    gap_percent: number | null;
    gap_score: number | null;
  };
  confidence: MarketBenchmarkQuality;
  limitations: string[];
  generated_at: string;
  /** Compatibility projection for legacy consumers. Safe-gated by V2 eligibility. */
  gap: PriceGapResult;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeNonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function safeAskingPricePerM2(price: number | null, surface: number | null): number | null {
  if (price == null || surface == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(surface) || price <= 0 || surface <= 0) return null;
  return roundToOneDecimal(price / surface);
}

function benchmarkAgeDays(observedAt: string | null, generatedAt: string): number | null {
  if (!observedAt) return null;
  const observed = new Date(observedAt).getTime();
  const generated = new Date(generatedAt).getTime();
  if (!Number.isFinite(observed) || !Number.isFinite(generated) || observed > generated) return null;
  return roundToOneDecimal((generated - observed) / 86_400_000);
}

function classifyBenchmarkFreshness(ageDays: number | null): MarketBenchmarkFreshness {
  if (ageDays == null) return "unknown";
  if (ageDays <= MARKET_BENCHMARK_CURRENT_MAX_AGE_DAYS) return "current";
  if (ageDays <= MARKET_BENCHMARK_AGING_MAX_AGE_DAYS) return "aging";
  return "stale";
}

function matchLevel(inputNeighborhood: string | null, benchmark: MarketBenchmarkMatch | null): MarketMatchLevel {
  if (!benchmark) return "none";
  if (benchmark.scope === "neighborhood") return "exact_neighborhood";
  return inputNeighborhood ? "city_fallback" : "city_direct";
}

function assessQuality(
  match: MarketMatchLevel,
  freshness: MarketBenchmarkFreshness,
  sampleSize: number | null,
  dispersionPct: number | null,
): MarketBenchmarkQuality {
  if (freshness === "stale" || freshness === "unknown" || match === "none") return "insufficient";
  if (freshness === "aging") return "low";

  const statisticallyTransparent = sampleSize != null && sampleSize >= 30 && dispersionPct != null;
  if (match === "exact_neighborhood") return statisticallyTransparent ? "high" : "medium";
  return statisticallyTransparent ? "medium" : "low";
}

function benchmarkAssessment(
  benchmark: MarketBenchmarkMatch | null,
  inputNeighborhood: string | null,
  generatedAt: string,
): MarketBenchmarkAssessmentV2 {
  const level = matchLevel(inputNeighborhood, benchmark);
  const ageDays = benchmarkAgeDays(benchmark?.benchmark_observed_at ?? null, generatedAt);
  const freshness = classifyBenchmarkFreshness(ageDays);
  const sampleSize = benchmark?.underlying_sample_size ?? null;
  const dispersionPct = benchmark?.dispersion_pct ?? null;

  return {
    source: benchmark?.benchmark_source ?? null,
    source_url: benchmark?.source_url ?? null,
    reference_kind: benchmark?.benchmark_method ?? null,
    scope: benchmark?.scope ?? null,
    city: benchmark?.city ?? null,
    neighborhood: benchmark?.neighborhood ?? null,
    property_type: benchmark?.property_type ?? null,
    benchmark_price_per_m2: benchmark?.benchmark_price_per_m2 ?? null,
    match_level: level,
    fallback_used: level === "city_fallback",
    observed_at: benchmark?.benchmark_observed_at ?? null,
    source_updated_at: benchmark?.source_updated_at ?? null,
    age_days: ageDays,
    freshness,
    underlying_sample_size: sampleSize,
    dispersion_pct: dispersionPct,
    sample_transparency: sampleSize == null ? "unknown" : "available",
    dispersion_transparency: dispersionPct == null ? "unknown" : "available",
    quality: assessQuality(level, freshness, sampleSize, dispersionPct),
  };
}

function safeInsufficientGap(raw: PriceGapResult): PriceGapResult {
  return {
    ...raw,
    price_gap_percent: null,
    price_gap_score: null,
    price_position: "insufficient_data",
  };
}

function compatibility(
  transactionType: "sale" | "rent" | null,
  propertySupported: boolean,
  match: MarketMatchLevel,
  marketSegment: MarketIntelligenceV2Input["market_segment"],
): MarketCompatibilityV2 {
  return {
    transaction: transactionType === "sale" ? "compatible" : transactionType === "rent" ? "incompatible" : "unknown",
    property_type: propertySupported ? "compatible" : "incompatible",
    geography: match === "exact_neighborhood" ? "compatible" : match === "city_direct" || match === "city_fallback" ? "limited" : "incompatible",
    market_segment:
      marketSegment === "new_build" || marketSegment === "off_plan"
        ? "incompatible"
        : marketSegment === "resale"
          ? "compatible"
          : "unknown",
    // Current benchmark is not segmented by surface band; price/m² remains only
    // an indicative normalization, not proof of like-for-like comparability.
    surface_segmentation: "limited",
  };
}

function buildLimitations(
  benchmark: MarketBenchmarkAssessmentV2,
  marketSegment: MarketIntelligenceV2Input["market_segment"],
): string[] {
  const limitations = [
    "Le prix analysé est un prix demandé, pas un prix de transaction constaté.",
    "Le repère de marché est indicatif et ne constitue ni une expertise, ni une estimation officielle, ni une recommandation d'achat.",
  ];
  if (benchmark.underlying_sample_size == null) {
    limitations.push("La taille de l'échantillon sous-jacent n'est pas publiée dans la référence intégrée.");
  }
  if (benchmark.dispersion_pct == null) {
    limitations.push("La dispersion statistique du benchmark n'est pas publiée dans la référence intégrée.");
  }
  if (benchmark.source_updated_at == null) {
    limitations.push("La date de mise à jour amont n'est pas exposée ; seule la date d'observation AkarFinder de la référence est connue.");
  }
  if (benchmark.fallback_used) {
    limitations.push("Aucun repère compatible de quartier n'a été trouvé ; la comparaison utilise un fallback de ville.");
  }
  if (marketSegment == null || marketSegment === "unknown") {
    limitations.push("Le segment neuf/revente n'est pas établi ; le benchmark intégré n'est pas segmenté par ce critère.");
  }
  limitations.push("Le benchmark intégré n'est pas segmenté par tranche de surface.");
  return limitations;
}

function result(
  input: MarketIntelligenceV2Input,
  reasonCode: MarketIntelligenceReasonCode,
  explanation: string,
  rawGap: PriceGapResult,
  benchmark: MarketBenchmarkAssessmentV2,
  compatibilityResult: MarketCompatibilityV2,
  status: MarketIntelligenceStatus,
): MarketIntelligenceV2 {
  const price = input.asking_price_mad ?? null;
  const surface = input.surface_m2 ?? null;
  const gap = status === "evaluated" ? rawGap : safeInsufficientGap(rawGap);
  const confidence = status === "evaluated" ? benchmark.quality : "insufficient";

  return {
    version: MARKET_INTELLIGENCE_V2_VERSION,
    status,
    reason_code: reasonCode,
    explanation,
    asking_price: {
      amount_mad: price,
      price_per_m2: safeAskingPricePerM2(price, surface),
      basis: "asking_price",
    },
    benchmark,
    compatibility: compatibilityResult,
    comparison: {
      position: gap.price_position,
      gap_percent: gap.price_gap_percent,
      gap_score: gap.price_gap_score,
    },
    confidence,
    limitations: buildLimitations(benchmark, input.market_segment),
    generated_at: input.generated_at ?? new Date().toISOString(),
    gap,
  };
}

export function evaluateMarketIntelligenceV2(input: MarketIntelligenceV2Input): MarketIntelligenceV2 {
  const generatedAt = input.generated_at ?? new Date().toISOString();
  const city = normalizeNonEmpty(input.city);
  const neighborhood = normalizeNonEmpty(input.neighborhood);
  const propertyType = normalizeMarketBenchmarkPropertyType(input.property_type);
  const price = input.asking_price_mad ?? null;
  const surface = input.surface_m2 ?? null;

  const rawGap = calculatePriceGap({
    city,
    neighborhood,
    property_type: input.property_type,
    surface_m2: surface,
    total_price_mad: price,
  });
  const matchedBenchmark = findMarketBenchmark({ city, neighborhood, property_type: input.property_type });
  const benchmark = benchmarkAssessment(matchedBenchmark, neighborhood, generatedAt);
  const compatibilityResult = compatibility(
    input.transaction_type ?? null,
    propertyType != null,
    benchmark.match_level,
    input.market_segment,
  );

  if (input.transaction_type == null) {
    return result(input, "missing_offer", "Le type de transaction n'est pas disponible.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (input.transaction_type === "rent") {
    return result(input, "rental_benchmark_unavailable", "Aucun benchmark locatif compatible n'est intégré pour cette comparaison.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (!propertyType) {
    return result(input, "unsupported_property_type", "Le type de bien n'est pas couvert par le benchmark marché actuel.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (!city) {
    return result(input, "missing_location", "La ville manque pour sélectionner un repère de marché compatible.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (price == null) {
    return result(input, "missing_price", "Le prix demandé manque pour calculer une comparaison marché.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (surface == null) {
    return result(input, "missing_surface", "La surface manque pour calculer le prix demandé au m².", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (!Number.isFinite(price) || !Number.isFinite(surface) || price <= 0 || surface <= 0) {
    return result(input, "invalid_price_or_surface", "Le prix ou la surface n'est pas exploitable pour une comparaison marché.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (input.market_segment === "new_build" || input.market_segment === "off_plan") {
    return result(
      input,
      "new_build_segment_benchmark_unavailable",
      "Le benchmark intégré n'est pas segmenté pour comparer explicitement un bien neuf ou sur plan.",
      rawGap,
      benchmark,
      compatibilityResult,
      "insufficient_data",
    );
  }
  if (!matchedBenchmark || rawGap.price_position === "insufficient_data") {
    return result(input, "benchmark_not_found", "Aucun repère de marché compatible n'a été trouvé.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (benchmark.freshness === "unknown") {
    return result(input, "benchmark_timestamp_unknown", "La date d'observation du benchmark n'est pas suffisamment établie.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }
  if (benchmark.freshness === "stale") {
    return result(input, "benchmark_stale", "Le benchmark observé est trop ancien pour soutenir une comparaison publique actuelle.", rawGap, benchmark, compatibilityResult, "insufficient_data");
  }

  const explanation = benchmark.fallback_used
    ? "Le prix demandé au m² est comparé à un repère indicatif de ville, faute de repère de quartier compatible."
    : benchmark.scope === "neighborhood"
      ? "Le prix demandé au m² est comparé à un repère indicatif de quartier compatible."
      : "Le prix demandé au m² est comparé à un repère indicatif de ville compatible.";

  return result(input, "ok", explanation, rawGap, benchmark, compatibilityResult, "evaluated");
}
