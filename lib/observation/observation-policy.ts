import type {
  ObservationLabel,
  ObservationRecord,
  ObservationSourceKind,
  ObservationSummary,
} from "./types";

const RECENT_OBSERVATION_WINDOW_MS = 72 * 60 * 60 * 1000; // 3 days

// For gateway/external results, only a prudent subset of the authorized
// labels may ever be shown — never anything implying confirmed availability.
const GATEWAY_ALLOWED_LABELS: ReadonlySet<ObservationLabel> = new Set([
  "Observé récemment",
  "Observé pendant cette recherche",
  "Première observation AkarFinder",
  "Déjà observé",
  "Observé plusieurs fois",
  "Source originale à confirmer",
]);

function isRecentlyObserved(
  lastObservedAt: string | undefined,
  now: number,
): boolean {
  if (!lastObservedAt) {
    return false;
  }

  const timestamp = Date.parse(lastObservedAt);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const delta = now - timestamp;
  return delta >= 0 && delta <= RECENT_OBSERVATION_WINDOW_MS;
}

function dedupe(labels: ObservationLabel[]): ObservationLabel[] {
  return Array.from(new Set(labels));
}

function restrictForSourceKind(
  labels: ObservationLabel[],
  sourceKind: ObservationSourceKind,
): ObservationLabel[] {
  if (sourceKind !== "external_web") {
    return dedupe(labels);
  }

  return dedupe(labels.filter((label) => GATEWAY_ALLOWED_LABELS.has(label)));
}

/**
 * Builds a prudent observation summary. With no record (or no persisted
 * history), the result is capped at "seen in this search" — never a false
 * sense of history for a result AkarFinder cannot vouch for.
 */
export function computeObservationSummary(
  record: ObservationRecord | null,
  sourceKind: ObservationSourceKind,
  now: number = Date.now(),
): ObservationSummary {
  const labels: ObservationLabel[] = [];

  const count = record?.observation_count ?? 0;

  if (count <= 0) {
    labels.push("Observé pendant cette recherche");

    if (sourceKind === "external_web") {
      labels.push("Source originale à confirmer");
    }

    return {
      labels: restrictForSourceKind(labels, sourceKind),
      help_line:
        sourceKind === "external_web"
          ? "La disponibilité reste à confirmer sur la source originale."
          : undefined,
    };
  }

  if (count >= 3) {
    labels.push("Observé plusieurs fois");
  } else if (count >= 2) {
    labels.push("Déjà observé");
  } else {
    labels.push("Première observation AkarFinder");
  }

  if (isRecentlyObserved(record?.last_observed_at, now)) {
    labels.push("Observé récemment");
  }

  if (sourceKind === "external_web") {
    labels.push("Source originale à confirmer");
  }

  return {
    labels: restrictForSourceKind(labels, sourceKind),
    help_line:
      sourceKind === "external_web"
        ? "La disponibilité reste à confirmer sur la source originale."
        : undefined,
  };
}
