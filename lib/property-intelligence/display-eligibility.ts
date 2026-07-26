import { getFeatureDefinition, isValidFeatureValue, type FeatureKey } from "./feature-registry";
import type { IntelligenceScore } from "./score-engine";

export type DisplayBlocker =
  | "unknown_feature"
  | "feature_not_public"
  | "invalid_feature_value"
  | "feature_status_not_publishable"
  | "methodology_not_allowed"
  | "insufficient_feature_confidence"
  | "feature_expired"
  | "evidence_not_displayable"
  | "batch_not_validated"
  | "score_blocked"
  | "score_not_public_candidate";

export type FeatureDisplayCandidate = {
  featureKey: FeatureKey;
  value: unknown;
  confidence: number;
  status: "observed" | "inferred" | "unknown" | "conflicted";
  method: string;
  generatedAt: string;
  validUntil?: string | null;
  evidenceDisplayable: boolean;
  batchValidated: boolean;
};

export type DisplayEligibility = {
  eligible: boolean;
  blockers: DisplayBlocker[];
  evaluatedAt: string;
};

function validDate(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function evaluateFeatureDisplayEligibility(
  candidate: FeatureDisplayCandidate,
  now = new Date(),
): DisplayEligibility {
  const blockers: DisplayBlocker[] = [];
  const definition = getFeatureDefinition(candidate.featureKey);
  const evaluatedAt = now.toISOString();

  if (!definition) {
    return { eligible: false, blockers: ["unknown_feature"], evaluatedAt };
  }
  if (!definition.publicEligible) blockers.push("feature_not_public");
  if (!isValidFeatureValue(candidate.featureKey, candidate.value)) blockers.push("invalid_feature_value");
  if (candidate.status !== "observed" && candidate.status !== "inferred") {
    blockers.push("feature_status_not_publishable");
  }
  if (!definition.methods.includes(candidate.method)) blockers.push("methodology_not_allowed");
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < definition.publicConfidenceThreshold) {
    blockers.push("insufficient_feature_confidence");
  }

  const generatedAt = validDate(candidate.generatedAt);
  const explicitValidUntil = candidate.validUntil ? validDate(candidate.validUntil) : null;
  const registryValidUntil = generatedAt !== null && definition.maxAgeDays !== null
    ? generatedAt + definition.maxAgeDays * 24 * 60 * 60 * 1000
    : null;
  const effectiveValidUntil = explicitValidUntil === null
    ? registryValidUntil
    : registryValidUntil === null
      ? explicitValidUntil
      : Math.min(explicitValidUntil, registryValidUntil);
  if (generatedAt === null || (effectiveValidUntil !== null && now.getTime() > effectiveValidUntil)) {
    blockers.push("feature_expired");
  }
  if (!candidate.evidenceDisplayable) blockers.push("evidence_not_displayable");
  if (!candidate.batchValidated) blockers.push("batch_not_validated");

  return { eligible: blockers.length === 0, blockers, evaluatedAt };
}

export function evaluateScoreDisplayEligibility(
  score: IntelligenceScore,
  batchValidated: boolean,
  now = new Date(),
): DisplayEligibility {
  const blockers: DisplayBlocker[] = [];
  if (score.status === "blocked" || score.score === null) blockers.push("score_blocked");
  if (score.status !== "public_candidate") blockers.push("score_not_public_candidate");
  if (!batchValidated) blockers.push("batch_not_validated");
  return { eligible: blockers.length === 0, blockers, evaluatedAt: now.toISOString() };
}
