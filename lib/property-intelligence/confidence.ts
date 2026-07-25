export type EvidenceStrength = "certified" | "structured" | "explicit_text" | "title" | "indirect";

const BASE_WEIGHT: Record<EvidenceStrength, number> = {
  certified: 0.98,
  structured: 0.92,
  explicit_text: 0.82,
  title: 0.72,
  indirect: 0.48,
};

export type ConfidenceInput = {
  supporting: EvidenceStrength[];
  contradicting?: EvidenceStrength[];
  sourceReliability?: number;
  freshnessFactor?: number;
};

export type ConfidenceResult = {
  confidence: number;
  conflicted: boolean;
  tier: "unusable" | "internal_hint" | "internal_usable" | "public_candidate" | "strongly_supported";
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function confidenceTier(value: number): ConfidenceResult["tier"] {
  if (value < 0.4) return "unusable";
  if (value < 0.6) return "internal_hint";
  if (value < 0.8) return "internal_usable";
  if (value < 0.95) return "public_candidate";
  return "strongly_supported";
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const sourceReliability = clamp(input.sourceReliability ?? 0.8);
  const freshnessFactor = clamp(input.freshnessFactor ?? 1);
  const support = input.supporting.map((kind) => BASE_WEIGHT[kind]);
  const contradiction = (input.contradicting ?? []).map((kind) => BASE_WEIGHT[kind]);
  const conflicted = contradiction.length > 0;

  if (support.length === 0) {
    return { confidence: 0.1, conflicted, tier: "unusable" };
  }

  const strongest = Math.max(...support);
  const corroborationBonus = Math.min(0.08, Math.max(0, support.length - 1) * 0.03);
  const contradictionPenalty = contradiction.length === 0
    ? 0
    : Math.min(0.65, Math.max(...contradiction) * 0.55 + (contradiction.length - 1) * 0.08);
  const confidence = clamp((strongest + corroborationBonus - contradictionPenalty) * sourceReliability * freshnessFactor);

  return {
    confidence: Number(confidence.toFixed(4)),
    conflicted,
    tier: confidenceTier(confidence),
  };
}
