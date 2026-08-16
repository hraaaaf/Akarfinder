import policy from "@/data/market/p1c2-neighborhood-offer-reliability-policy.json";
import type { ReliabilityState } from "@/lib/map/intelligence-scale";

export type MetricReliabilityObservation = {
  value: number;
  fresh: boolean;
  sourceDomain: string;
};

export type MetricReliabilityResult = {
  level: ReliabilityState;
  sampleCount: number;
  fieldCoveragePercent: number;
  freshSamplePercent: number;
  sourceDomainCount: number;
  outlierPercent: number;
  iqrToMedianRatio: number | null;
  median: number | null;
};

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function passesThreshold(
  result: Omit<MetricReliabilityResult, "level">,
  threshold: {
    min_sample_count: number;
    min_field_coverage_percent: number;
    min_fresh_sample_percent: number;
    min_source_domain_count: number;
    max_outlier_percent: number;
    max_iqr_to_median_ratio: number;
  },
): boolean {
  return result.sampleCount >= threshold.min_sample_count &&
    result.fieldCoveragePercent >= threshold.min_field_coverage_percent &&
    result.freshSamplePercent >= threshold.min_fresh_sample_percent &&
    result.sourceDomainCount >= threshold.min_source_domain_count &&
    result.outlierPercent <= threshold.max_outlier_percent &&
    result.iqrToMedianRatio != null &&
    result.iqrToMedianRatio <= threshold.max_iqr_to_median_ratio;
}

export function evaluateMetricReliability(input: {
  listingCount: number;
  observations: readonly MetricReliabilityObservation[];
}): MetricReliabilityResult {
  const listingCount = Number.isFinite(input.listingCount) && input.listingCount >= 0 ? input.listingCount : 0;
  const observations = input.observations.filter((row) => Number.isFinite(row.value) && row.value > 0);
  const values = observations.map((row) => row.value).sort((a, b) => a - b);
  const sampleCount = values.length;
  const median = sampleCount ? quantile(values, 0.5) : null;
  const q1 = sampleCount ? quantile(values, 0.25) : null;
  const q3 = sampleCount ? quantile(values, 0.75) : null;
  const iqr = q1 != null && q3 != null ? q3 - q1 : null;
  const lowerFence = q1 != null && iqr != null ? q1 - 1.5 * iqr : null;
  const upperFence = q3 != null && iqr != null ? q3 + 1.5 * iqr : null;
  const outlierCount = lowerFence == null || upperFence == null
    ? 0
    : values.filter((value) => value < lowerFence || value > upperFence).length;

  const base = {
    sampleCount,
    fieldCoveragePercent: listingCount > 0 ? (sampleCount / listingCount) * 100 : 0,
    freshSamplePercent: sampleCount > 0 ? (observations.filter((row) => row.fresh).length / sampleCount) * 100 : 0,
    sourceDomainCount: new Set(observations.map((row) => row.sourceDomain).filter(Boolean)).size,
    outlierPercent: sampleCount > 0 ? (outlierCount / sampleCount) * 100 : 0,
    iqrToMedianRatio: median != null && median > 0 && iqr != null ? iqr / median : null,
    median,
  };

  let level: ReliabilityState = "insufficient";
  if (passesThreshold(base, policy.metric_thresholds.strong)) level = "strong";
  else if (passesThreshold(base, policy.metric_thresholds.moderate)) level = "moderate";
  else if (passesThreshold(base, policy.metric_thresholds.limited)) level = "limited";

  return { level, ...base };
}
