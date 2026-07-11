import type { Listing } from "@/lib/listings/types";
import type { MarketBenchmarkSourceId } from "@/lib/market/market-benchmark-registry";

import type { PricePositionDisplay, PricePositionDecisionReason } from "./types";

export type PricePositionBenchmarkLevel = "district" | "city" | "unavailable";
export type PricePositionFallbackApplied = "none" | "district_to_city" | "unavailable";

export type PricePositionDecisionInternal = {
  listing_id: string;
  price: number;
  surface: number;
  calculated_price_per_m2: number;
  property_type: Listing["property_type"];
  city: string;
  district: string | null;
  benchmark_id: string | null;
  benchmark_level: PricePositionBenchmarkLevel;
  benchmark_value: number | null;
  benchmark_date: string | null;
  benchmark_methodology: string | null;
  benchmark_source_type: MarketBenchmarkSourceId | null;
  position_result: "coherent" | "high" | "low" | "unavailable";
  decision_reason: PricePositionDecisionReason;
  fallback_applied: PricePositionFallbackApplied;
  public_view: PricePositionDisplay | null;
};
