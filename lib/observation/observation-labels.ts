import type { ObservationLabel } from "./types";

export const AUTHORIZED_OBSERVATION_LABELS: readonly ObservationLabel[] = [
  "Observé récemment",
  "Observé pendant cette recherche",
  "Première observation AkarFinder",
  "Déjà observé",
  "Observé plusieurs fois",
  "Dernière observation récente",
  "Source originale à confirmer",
  "Aperçu limité",
];

/**
 * Wording that would imply a promise AkarFinder cannot keep for a result it
 * did not verify first-hand. Kept here only for scans/tests, never rendered.
 */
export const FORBIDDEN_OBSERVATION_WORDING: readonly string[] = [
  "disponible confirmé",
  "annonce active",
  "annonce toujours disponible",
  "annonce vérifiée",
  "annonce fiable",
  "score de fraîcheur",
  "score de fiabilité",
  "mis à jour par la source",
  "prix confirmé",
];

export function isAuthorizedObservationLabel(
  value: string,
): value is ObservationLabel {
  return (AUTHORIZED_OBSERVATION_LABELS as readonly string[]).includes(value);
}
