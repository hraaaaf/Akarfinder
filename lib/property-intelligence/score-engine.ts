export type ScoreFactor = {
  key: string;
  value: number;
  weight: number;
  confidence: number;
  eligible: boolean;
};

export type IntelligenceScore = {
  score: number | null;
  confidence: number;
  coverage: number;
  status: "blocked" | "internal" | "public_candidate";
  blockers: string[];
  contributions: Array<{ key: string; weightedValue: number }>;
  methodologyVersion: string;
};

const clamp100 = (value: number) => Math.max(0, Math.min(100, value));

export function calculateWeightedScore(
  factors: ScoreFactor[],
  options: { minCoverage: number; minConfidence: number; methodologyVersion: string; publicEnabled: boolean },
): IntelligenceScore {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const eligible = factors.filter((factor) => factor.eligible && factor.confidence >= options.minConfidence);
  const eligibleWeight = eligible.reduce((sum, factor) => sum + factor.weight, 0);
  const coverage = totalWeight > 0 ? eligibleWeight / totalWeight : 0;
  const blockers: string[] = [];
  if (coverage < options.minCoverage) blockers.push("insufficient_factor_coverage");
  if (eligible.length === 0) blockers.push("no_eligible_factor");
  if (blockers.length) {
    return { score: null, confidence: 0, coverage: Number(coverage.toFixed(4)), status: "blocked", blockers, contributions: [], methodologyVersion: options.methodologyVersion };
  }
  const weighted = eligible.reduce((sum, factor) => sum + clamp100(factor.value) * factor.weight, 0) / eligibleWeight;
  const confidence = eligible.reduce((sum, factor) => sum + factor.confidence * factor.weight, 0) / eligibleWeight;
  const contributions = eligible.map((factor) => ({ key: factor.key, weightedValue: Number((factor.value * factor.weight / eligibleWeight).toFixed(3)) }));
  return {
    score: Number(weighted.toFixed(1)), confidence: Number(confidence.toFixed(4)), coverage: Number(coverage.toFixed(4)),
    status: options.publicEnabled && confidence >= 0.85 ? "public_candidate" : "internal",
    blockers: [], contributions, methodologyVersion: options.methodologyVersion,
  };
}

export function calculateACI(factors: ScoreFactor[]): IntelligenceScore {
  return calculateWeightedScore(factors, { minCoverage: 0.6, minConfidence: 0.7, methodologyVersion: "aci_v1", publicEnabled: true });
}

export function calculateAQI(factors: ScoreFactor[]): IntelligenceScore {
  return calculateWeightedScore(factors, { minCoverage: 0.7, minConfidence: 0.75, methodologyVersion: "aqi_v1_internal", publicEnabled: false });
}
