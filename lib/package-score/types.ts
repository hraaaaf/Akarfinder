export type PackageSignalLevel = "high" | "medium" | "low" | "insufficient";

export type PackageScoreConfidence =
  | "élevée"
  | "moyenne"
  | "faible"
  | "données insuffisantes";

export type PackageScoreLabel =
  | "Excellent package"
  | "Bon package"
  | "Package correct"
  | "À analyser"
  | "Données insuffisantes";

export type PackageScoreSignal = {
  level: PackageSignalLevel;
  label: string;
  detail?: string;
};

export type PackageScoreResult = {
  overall_label: PackageScoreLabel;
  overall_score: number;
  confidence: PackageScoreConfidence;
  summary: string;
  signals: {
    reliability: PackageScoreSignal;
    proximity: PackageScoreSignal;
    market_price: PackageScoreSignal;
  };
  missing_signals: number;
  disclaimer: string;
};
