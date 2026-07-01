// REAL-PROXIMITY-ENGINE-1 — Display label formatting for proximity items.

import type { RealProximityConfidence, RealProximityBasis } from "./proximity-types";

export const PROXIMITY_DISCLAIMER =
  "Repères indicatifs à confirmer selon l'adresse exacte.";

export const PROXIMITY_DISCLAIMER_GPS =
  "Repères indicatifs à confirmer selon l'adresse exacte. Estimation basée sur localisation GPS et données cartographiques.";

/**
 * Converts a minute count to a qualitative label.
 * Used when exact minutes cannot be shown (city-only or district-only basis).
 */
export function minutesToQualitative(minutes: number): string {
  if (minutes <= 5) return "à proximité";
  if (minutes <= 10) return "dans le secteur";
  if (minutes <= 15) return "accessible";
  return "à vérifier";
}

/**
 * Formats a display label based on confidence and basis.
 *
 * Rules:
 * - GPS + high confidence → "~X min à pied (estimation)"
 * - district or GPS + medium/low → qualitative label
 * - city-only or unknown → qualitative label
 */
export function formatWalkingLabel(
  minutes: number | undefined,
  confidence: RealProximityConfidence,
  basis: RealProximityBasis
): string {
  if (
    basis === "exact_gps" &&
    confidence === "high" &&
    minutes != null &&
    minutes > 0
  ) {
    return `~${minutes} min à pied (estimation)`;
  }

  if (minutes != null) {
    return minutesToQualitative(minutes);
  }

  return "à confirmer";
}

/** Human-readable label for the data basis shown in the UI footer. */
export function basisToSourceLabel(basis: RealProximityBasis): string {
  switch (basis) {
    case "exact_gps":         return "Basé sur coordonnées GPS + données cartographiques";
    case "district_centroid": return "Estimation selon le quartier";
    case "city_only":         return "Données ville indicatives";
    default:                  return "Données indicatives";
  }
}

/** Short confidence badge label. */
export function confidenceLabel(confidence: RealProximityConfidence): string {
  switch (confidence) {
    case "high":   return "localisation précise";
    case "medium": return "estimation quartier";
    case "low":    return "indicatif";
  }
}
