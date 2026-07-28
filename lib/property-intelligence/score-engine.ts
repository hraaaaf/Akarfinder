export type ScoreFactor = {
  key: string;
  value: number;
  weight: number;
  confidence: number;
  eligible: boolean;
};

export type ScoreBlocker =
  | "no_factors"
  | "invalid_factor"
  | "duplicate_factor_key"
  | "insufficient_factor_coverage"
  | "no_eligible_factor"
  | "insufficient_score_confidence";

export type ScoreContribution = {
  key: string;
  normalizedWeight: number;
  weightedValue: number;
  confidence: number;
};

export type IntelligenceScore = {
  score: number | null;
  confidence: number;
  coverage: number;
  status: "blocked" | "internal" | "public_candidate";
  blockers: ScoreBlocker[];
  contributions: ScoreContribution[];
  methodologyVersion: string;
};

export type ScoreOptions = {
  minCoverage: number;
  minFactorConfidence: number;
  minPublicConfidence: number;
  methodologyVersion: string;
  publicEnabled: boolean;
};

const clamp100 = (value: number) => Math.max(0, Math.min(100, value));
const round4 = (value: number) => Number(value.toFixed(4));

function isValidFactor(factor: ScoreFactor): boolean {
  return factor.key.trim().length > 0
    && Number.isFinite(factor.value)
    && Number.isFinite(factor.weight)
    && factor.weight > 0
    && Number.isFinite(factor.confidence)
    && factor.confidence >= 0
    && factor.confidence <= 1;
}

export function calculateWeightedScore(factors: ScoreFactor[], options: ScoreOptions): IntelligenceScore {
  const blockers: ScoreBlocker[] = [];

  if (factors.length === 0) blockers.push("no_factors");
  if (factors.some((factor) => !isValidFactor(factor))) blockers.push("invalid_factor");
  if (new Set(factors.map((factor) => factor.key)).size !== factors.length) blockers.push("duplicate_factor_key");

  if (blockers.length > 0) {
    return {
      score: null,
      confidence: 0,
      coverage: 0,
      status: "blocked",
      blockers,
      contributions: [],
      methodologyVersion: options.methodologyVersion,
    };
  }

  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const eligible = factors.filter(
    (factor) => factor.eligible && factor.confidence >= options.minFactorConfidence,
  );
  const eligibleWeight = eligible.reduce((sum, factor) => sum + factor.weight, 0);
  const coverage = totalWeight > 0 ? eligibleWeight / totalWeight : 0;

  if (coverage < options.minCoverage) blockers.push("insufficient_factor_coverage");
  if (eligible.length === 0) blockers.push("no_eligible_factor");

  if (blockers.length > 0) {
    return {
      score: null,
      confidence: 0,
      coverage: round4(coverage),
      status: "blocked",
      blockers,
      contributions: [],
      methodologyVersion: options.methodologyVersion,
    };
  }

  const score = eligible.reduce(
    (sum, factor) => sum + clamp100(factor.value) * factor.weight,
    0,
  ) / eligibleWeight;
  const confidence = eligible.reduce(
    (sum, factor) => sum + factor.confidence * factor.weight,
    0,
  ) / eligibleWeight;
  const contributions = eligible.map((factor) => {
    const normalizedWeight = factor.weight / eligibleWeight;
    return {
      key: factor.key,
      normalizedWeight: round4(normalizedWeight),
      weightedValue: Number((clamp100(factor.value) * normalizedWeight).toFixed(3)),
      confidence: round4(factor.confidence),
    };
  });

  const status = options.publicEnabled && confidence >= options.minPublicConfidence
    ? "public_candidate"
    : "internal";
  if (options.publicEnabled && confidence < options.minPublicConfidence) {
    blockers.push("insufficient_score_confidence");
  }

  return {
    score: Number(score.toFixed(1)),
    confidence: round4(confidence),
    coverage: round4(coverage),
    status,
    blockers,
    contributions,
    methodologyVersion: options.methodologyVersion,
  };
}

export function calculateACI(factors: ScoreFactor[]): IntelligenceScore {
  return calculateWeightedScore(factors, {
    minCoverage: 0.6,
    minFactorConfidence: 0.7,
    minPublicConfidence: 0.85,
    methodologyVersion: "aci_v1",
    publicEnabled: true,
  });
}

export function calculateAQI(factors: ScoreFactor[]): IntelligenceScore {
  return calculateWeightedScore(factors, {
    minCoverage: 0.7,
    minFactorConfidence: 0.75,
    minPublicConfidence: 1,
    methodologyVersion: "aqi_v1_internal",
    publicEnabled: false,
  });
}
