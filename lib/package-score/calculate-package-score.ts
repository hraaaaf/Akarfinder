import type { ProximityPoint } from "@/lib/proximity/types";
import type { ListingPriceComparison } from "@/lib/market/types";
import type {
  PackageScoreResult,
  PackageScoreSignal,
  PackageSignalLevel,
  PackageScoreLabel,
  PackageScoreConfidence,
} from "./types";

const SCORE_THRESHOLD_MINUTES = 15;
const ALL_CATEGORIES_COUNT = 13;

function signalForReliability(
  score: number,
  available: boolean,
  duplicateScore?: number
): PackageScoreSignal {
  if (!available) {
    return { level: "insufficient", label: "Niveau d'information non disponible" };
  }
  if (duplicateScore != null && duplicateScore >= 0.7) {
    return { level: "low", label: "Doublon possible", detail: `Niveau d'information ${score}/100` };
  }
  if (score >= 80) {
    return {
      level: "high",
      label: "Informations bien renseignées",
      detail: `Niveau d'information ${score}/100`,
    };
  }
  if (score >= 50) {
    return {
      level: "medium",
      label: "Informations à compléter",
      detail: `Niveau d'information ${score}/100`,
    };
  }
  return { level: "low", label: "Informations limitées", detail: `Niveau d'information ${score}/100` };
}

function signalForProximity(points: ProximityPoint[]): PackageScoreSignal {
  if (points.length < 3) {
    return { level: "insufficient", label: "Données proximité non disponibles" };
  }
  const accessible = new Set(
    points.filter((p) => p.distance_minutes <= SCORE_THRESHOLD_MINUTES).map((p) => p.category)
  ).size;
  const detail = `${accessible}/${ALL_CATEGORIES_COUNT} repères accessibles`;
  if (accessible >= 8) return { level: "high", label: "Proximité forte", detail };
  if (accessible >= 5) return { level: "medium", label: "Proximité correcte", detail };
  if (accessible >= 3) return { level: "low", label: "Proximité limitée", detail };
  return { level: "insufficient", label: "Données proximité insuffisantes" };
}

function signalForMarketPrice(comparison: ListingPriceComparison): PackageScoreSignal {
  if (comparison.comparison_label === "Données insuffisantes") {
    return { level: "insufficient", label: "Données prix non disponibles" };
  }
  const conf = comparison.confidence;
  const pct = comparison.difference_percent;
  const pctStr = pct != null ? `${pct > 0 ? "+" : ""}${pct}% vs repère` : undefined;

  if (comparison.comparison_label === "Prix inférieur au repère observé") {
    return { level: "high", label: "Prix inférieur au repère", detail: pctStr };
  }
  if (comparison.comparison_label === "Prix cohérent") {
    if (conf === "élevée" || conf === "moyenne") return { level: "high", label: "Prix cohérent", detail: `Confiance ${conf}` };
    return { level: "medium", label: "Prix cohérent (données limitées)", detail: `Confiance ${conf ?? "faible"}` };
  }
  if (conf === "élevée") return { level: "low", label: "Prix supérieur au repère observé", detail: pctStr };
  return { level: "medium", label: "Prix au-dessus du repère", detail: pctStr };
}

function levelToNumber(level: PackageSignalLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  if (level === "low") return 1;
  return 0;
}

function computeConfidence(signals: PackageScoreSignal[], calculableCount: number): PackageScoreConfidence {
  if (calculableCount < 2) return "données insuffisantes";
  if (signals.some((s) => s.level === "low")) return "faible";
  if (signals.filter((s) => s.level !== "insufficient").every((s) => s.level === "high")) return "élevée";
  return "moyenne";
}

export function calculatePackageScore(
  reliabilityScore: number,
  reliabilityAvailable: boolean,
  duplicateScore: number | undefined,
  proximityPoints: ProximityPoint[],
  priceComparison: ListingPriceComparison
): PackageScoreResult {
  const relSignal = signalForReliability(reliabilityScore, reliabilityAvailable, duplicateScore);
  const proxSignal = signalForProximity(proximityPoints);
  const mktSignal = signalForMarketPrice(priceComparison);

  const allSignals = [relSignal, proxSignal, mktSignal];
  const calculable = allSignals.filter((s) => s.level !== "insufficient");
  const missingCount = allSignals.length - calculable.length;

  let overallLabel: PackageScoreLabel;
  let overallScore: number;

  if (calculable.length < 2) {
    overallLabel = "Données insuffisantes";
    overallScore = 0;
  } else {
    const sum = calculable.reduce((acc, s) => acc + levelToNumber(s.level), 0);
    const avg = sum / calculable.length;
    overallScore = Math.round((sum / (3 * calculable.length)) * 100);
    if (avg >= 2.7) overallLabel = "Excellent package";
    else if (avg >= 2.3) overallLabel = "Bon package";
    else if (avg >= 1.5) overallLabel = "Package correct";
    else overallLabel = "À analyser";
  }

  const confidence = computeConfidence(allSignals, calculable.length);

  const summaryParts = calculable.map((s) => s.label);
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : "Données insuffisantes pour établir un résumé.";

  return {
    overall_label: overallLabel,
    overall_score: overallScore,
    confidence,
    summary,
    signals: {
      reliability: relSignal,
      proximity: proxSignal,
      market_price: mktSignal,
    },
    missing_signals: missingCount,
    disclaimer: "Synthèse indicative basée sur les données disponibles — à vérifier avant décision.",
  };
}
