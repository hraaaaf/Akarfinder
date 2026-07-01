import {
  findMarketBenchmark,
  normalizeMarketBenchmarkPropertyType,
  type MarketBenchmarkLookupInput,
  type MarketBenchmarkPropertyType,
  type MarketBenchmarkScope,
} from "./market-benchmark-registry";

export type PricePosition =
  | "below_market"
  | "near_market"
  | "above_market"
  | "overpriced"
  | "insufficient_data";

export type PriceGapInput = MarketBenchmarkLookupInput & {
  surface_m2?: number | null;
  total_price_mad?: number | null;
};

export type PriceGapResult = {
  benchmark_source: "yakeey";
  benchmark_scope: MarketBenchmarkScope | null;
  benchmark_city: string | null;
  benchmark_neighborhood: string | null;
  benchmark_property_type: MarketBenchmarkPropertyType | null;
  price_per_m2: number | null;
  benchmark_price_per_m2: number | null;
  price_gap_percent: number | null;
  price_gap_score: number | null;
  price_position: PricePosition;
};

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function computePriceGapScore(gapPercent: number | null): number | null {
  if (gapPercent === null || !Number.isFinite(gapPercent)) return null;
  const score = 100 - Math.min(100, Math.abs(gapPercent) * 2);
  return Math.max(0, Math.round(score));
}

function getPricePosition(gapPercent: number | null): PricePosition {
  if (gapPercent === null || !Number.isFinite(gapPercent)) return "insufficient_data";
  if (gapPercent <= -15) return "below_market";
  if (gapPercent < 15) return "near_market";
  if (gapPercent < 30) return "above_market";
  return "overpriced";
}

export function calculatePriceGap(input: PriceGapInput): PriceGapResult {
  const benchmark = findMarketBenchmark(input);
  const propertyType = normalizeMarketBenchmarkPropertyType(input.property_type);
  const totalPrice = input.total_price_mad ?? null;
  const surfaceM2 = input.surface_m2 ?? null;

  if (
    benchmark === null ||
    propertyType === null ||
    totalPrice === null ||
    surfaceM2 === null ||
    !Number.isFinite(totalPrice) ||
    !Number.isFinite(surfaceM2) ||
    totalPrice <= 0 ||
    surfaceM2 <= 0
  ) {
    return {
      benchmark_source: "yakeey",
      benchmark_scope: benchmark?.scope ?? null,
      benchmark_city: benchmark?.city ?? null,
      benchmark_neighborhood: benchmark?.neighborhood ?? null,
      benchmark_property_type: benchmark ? benchmark.property_type : propertyType,
      price_per_m2: totalPrice !== null && surfaceM2 !== null && totalPrice > 0 && surfaceM2 > 0 ? roundToOneDecimal(totalPrice / surfaceM2) : null,
      benchmark_price_per_m2: benchmark?.benchmark_price_per_m2 ?? null,
      price_gap_percent: null,
      price_gap_score: null,
      price_position: "insufficient_data",
    };
  }

  const pricePerM2 = totalPrice / surfaceM2;
  const gapPercent = ((pricePerM2 - benchmark.benchmark_price_per_m2) / benchmark.benchmark_price_per_m2) * 100;

  return {
    benchmark_source: "yakeey",
    benchmark_scope: benchmark.scope,
    benchmark_city: benchmark.city,
    benchmark_neighborhood: benchmark.neighborhood,
    benchmark_property_type: benchmark.property_type,
    price_per_m2: roundToOneDecimal(pricePerM2),
    benchmark_price_per_m2: benchmark.benchmark_price_per_m2,
    price_gap_percent: roundToOneDecimal(gapPercent),
    price_gap_score: computePriceGapScore(gapPercent),
    price_position: getPricePosition(gapPercent),
  };
}

