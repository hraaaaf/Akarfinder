import type { OdmDualReadDivergence } from "@/lib/odm/odm-dual-read-shadow";

export type OdmDivergenceVerdict =
  | "legacy_better"
  | "odm_better"
  | "equivalent"
  | "odm_regression"
  | "human_review";

export type OdmDivergenceCause =
  | "coverage"
  | "ranking"
  | "canonicalization"
  | "trusted_price"
  | "trusted_surface"
  | "insufficient_evidence";

export type OdmDivergenceAssessment = {
  version: "odm_divergence_assessment_v1";
  stable_key_hash: string;
  verdict: OdmDivergenceVerdict;
  primary_cause: OdmDivergenceCause;
  confidence: number;
  severity: "low" | "medium" | "high";
  signals: string[];
};

export type OdmDivergenceSummary = {
  version: "odm_divergence_summary_v1";
  sample_size: number;
  verdict_counts: Record<OdmDivergenceVerdict, number>;
  cause_counts: Record<OdmDivergenceCause, number>;
  mean_canonical_overlap_rate: number;
  mean_rank_overlap_at_10: number;
  price_divergence_rate: number;
  surface_divergence_rate: number;
  stop_public_canary: boolean;
  stop_reasons: string[];
};

const blankVerdicts = (): Record<OdmDivergenceVerdict, number> => ({
  legacy_better: 0,
  odm_better: 0,
  equivalent: 0,
  odm_regression: 0,
  human_review: 0,
});

const blankCauses = (): Record<OdmDivergenceCause, number> => ({
  coverage: 0,
  ranking: 0,
  canonicalization: 0,
  trusted_price: 0,
  trusted_surface: 0,
  insufficient_evidence: 0,
});

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function assessOdmDivergence(metric: OdmDualReadDivergence): OdmDivergenceAssessment {
  const signals: string[] = [];
  const priceRate = ratio(metric.trusted_price_divergences, metric.trusted_price_comparisons);
  const surfaceRate = ratio(metric.trusted_surface_divergences, metric.trusted_surface_comparisons);
  const rankRate = metric.rank_overlap_at_10 / Math.max(1, Math.min(10, metric.legacy_count, metric.odm_count));

  if (metric.legacy_count === 0 && metric.odm_count === 0) {
    return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "human_review", primary_cause: "insufficient_evidence", confidence: 0.2, severity: "low", signals: ["both_empty"] };
  }

  if (priceRate > 0.02) signals.push("trusted_price_divergence");
  if (surfaceRate > 0.03) signals.push("trusted_surface_divergence");
  if (metric.canonical_overlap_rate < 0.5) signals.push("low_canonical_overlap");
  if (rankRate < 0.4) signals.push("low_rank_overlap");
  if (metric.odm_count > metric.legacy_count * 1.2) signals.push("odm_coverage_gain");
  if (metric.odm_count < metric.legacy_count * 0.8) signals.push("odm_coverage_loss");

  if (priceRate > 0.05) return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "odm_regression", primary_cause: "trusted_price", confidence: 0.95, severity: "high", signals };
  if (surfaceRate > 0.08) return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "odm_regression", primary_cause: "trusted_surface", confidence: 0.95, severity: "high", signals };
  if (metric.canonical_overlap_rate < 0.25) return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "human_review", primary_cause: "canonicalization", confidence: 0.8, severity: "high", signals };
  if (metric.odm_count < metric.legacy_count * 0.8) return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "legacy_better", primary_cause: "coverage", confidence: 0.85, severity: "medium", signals };
  if (metric.odm_count > metric.legacy_count * 1.2 && metric.canonical_overlap_rate >= 0.5 && priceRate <= 0.02 && surfaceRate <= 0.03) return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "odm_better", primary_cause: "coverage", confidence: 0.8, severity: "low", signals };
  if (rankRate < 0.4) return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "human_review", primary_cause: "ranking", confidence: 0.7, severity: "medium", signals };
  return { version: "odm_divergence_assessment_v1", stable_key_hash: metric.stable_key_hash, verdict: "equivalent", primary_cause: "coverage", confidence: 0.8, severity: "low", signals };
}

export function summarizeOdmDivergences(metrics: OdmDualReadDivergence[]): OdmDivergenceSummary {
  const verdict_counts = blankVerdicts();
  const cause_counts = blankCauses();
  let overlap = 0;
  let rank = 0;
  let priceComparisons = 0;
  let priceDivergences = 0;
  let surfaceComparisons = 0;
  let surfaceDivergences = 0;

  for (const metric of metrics) {
    const assessment = assessOdmDivergence(metric);
    verdict_counts[assessment.verdict] += 1;
    cause_counts[assessment.primary_cause] += 1;
    overlap += metric.canonical_overlap_rate;
    rank += metric.rank_overlap_at_10;
    priceComparisons += metric.trusted_price_comparisons;
    priceDivergences += metric.trusted_price_divergences;
    surfaceComparisons += metric.trusted_surface_comparisons;
    surfaceDivergences += metric.trusted_surface_divergences;
  }

  const priceRate = ratio(priceDivergences, priceComparisons);
  const surfaceRate = ratio(surfaceDivergences, surfaceComparisons);
  const stopReasons: string[] = [];
  if (metrics.length < 200) stopReasons.push("insufficient_sample");
  if (priceRate > 0.02) stopReasons.push("trusted_price_divergence_exceeded");
  if (surfaceRate > 0.03) stopReasons.push("trusted_surface_divergence_exceeded");
  if (metrics.length > 0 && verdict_counts.odm_regression / metrics.length > 0.01) stopReasons.push("odm_regression_rate_exceeded");

  return {
    version: "odm_divergence_summary_v1",
    sample_size: metrics.length,
    verdict_counts,
    cause_counts,
    mean_canonical_overlap_rate: ratio(overlap, metrics.length),
    mean_rank_overlap_at_10: ratio(rank, metrics.length),
    price_divergence_rate: priceRate,
    surface_divergence_rate: surfaceRate,
    stop_public_canary: stopReasons.length > 0,
    stop_reasons: stopReasons,
  };
}
