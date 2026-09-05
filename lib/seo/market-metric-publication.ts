export type MarketMetricReliabilityLevel =
  | "strong"
  | "moderate"
  | "limited"
  | "insufficient";

export type MarketMetricPublicationInput = {
  reliabilityLevel: MarketMetricReliabilityLevel | string | null | undefined;
  marketRepresentativenessCertified: boolean;
  publicActivation: boolean;
  metricState: string | null | undefined;
  median: number | null | undefined;
};

export type MarketMetricPublicationReason =
  | "eligible"
  | "reliability_too_low"
  | "not_certified"
  | "not_public"
  | "shadow_state"
  | "invalid_metric";

export type MarketMetricPublicationDecision = {
  publishable: boolean;
  reason: MarketMetricPublicationReason;
};

const PUBLIC_RELIABILITY_LEVELS = new Set<MarketMetricReliabilityLevel>([
  "moderate",
  "strong",
]);

function isValidMedian(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * SEO-5 publication contract.
 *
 * This deliberately does not reimplement the ODM statistical thresholds.
 * The database reliability policy remains the source of truth for sample size,
 * coverage, freshness, source diversity, outliers and dispersion. This layer
 * only decides whether an already-evaluated metric may cross the public SEO
 * boundary.
 */
export function evaluateMarketMetricPublication(
  input: MarketMetricPublicationInput,
): MarketMetricPublicationDecision {
  if (!isValidMedian(input.median)) {
    return { publishable: false, reason: "invalid_metric" };
  }

  if (!PUBLIC_RELIABILITY_LEVELS.has(input.reliabilityLevel as MarketMetricReliabilityLevel)) {
    return { publishable: false, reason: "reliability_too_low" };
  }

  if (!input.marketRepresentativenessCertified) {
    return { publishable: false, reason: "not_certified" };
  }

  if (!input.publicActivation) {
    return { publishable: false, reason: "not_public" };
  }

  if ((input.metricState ?? "").trim().toLowerCase() === "shadow") {
    return { publishable: false, reason: "shadow_state" };
  }

  return { publishable: true, reason: "eligible" };
}
