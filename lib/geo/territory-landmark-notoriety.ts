export type LandmarkNotorietyInput = {
  publicRecognition: number;
  orientationValue: number;
  visualSingularity: number;
  confidence: number;
};

export type LandmarkNotorietyTier =
  | "iconic"
  | "major"
  | "strong_local"
  | "contextual"
  | "reject";

export type LandmarkNotorietyResult = {
  score: number;
  tier: LandmarkNotorietyTier;
  eligible: boolean;
  confidence: number;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scoreLandmarkNotoriety(input: LandmarkNotorietyInput): LandmarkNotorietyResult {
  const publicRecognition = clampScore(input.publicRecognition);
  const orientationValue = clampScore(input.orientationValue);
  const visualSingularity = clampScore(input.visualSingularity);
  const confidence = clampScore(input.confidence);

  if (confidence < 80) {
    return { score: 0, tier: "reject", eligible: false, confidence };
  }

  const score = Math.round(
    publicRecognition * 0.5 +
    orientationValue * 0.3 +
    visualSingularity * 0.2,
  );

  const tier: LandmarkNotorietyTier =
    score >= 90 ? "iconic" :
    score >= 75 ? "major" :
    score >= 60 ? "strong_local" :
    score >= 45 ? "contextual" :
    "reject";

  return {
    score,
    tier,
    eligible: tier !== "reject",
    confidence,
  };
}
