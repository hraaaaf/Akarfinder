import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";

export type MarketComparableTruthEvidence = {
  comparables_certified: boolean;
  comparable_count: number;
  market_position_certified: boolean;
};

export function buildMarketComparableTruthEvidence(
  model: MarketComparableSet | null | undefined,
): MarketComparableTruthEvidence {
  const comparablesCertified =
    model?.status === "certified" &&
    model.sampleCount >= 3 &&
    model.comparables.length > 0 &&
    model.distribution != null;

  return {
    comparables_certified: comparablesCertified,
    comparable_count: comparablesCertified ? model.sampleCount : 0,
    market_position_certified:
      comparablesCertified &&
      model.distribution?.targetPricePerM2 != null &&
      model.distribution.targetPosition != null,
  };
}
