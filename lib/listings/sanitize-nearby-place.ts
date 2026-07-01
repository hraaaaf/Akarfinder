// NEIGHBORHOOD-PROXIMITY-DB-SANITIZE-1
// Sanitizes a nearby place time label before display.
//
// Rule: if the value is an exact minute count (e.g. "6 min", "10 min à pied"),
// it must be converted to a qualitative label unless it comes from a declared
// source with confidence metadata (ProximityPoint — not NearbyPlace).
//
// NearbyPlace has no source/confidence field, so any "X min" in a NearbyPlace
// is unsourced by definition. Always sanitize at display time; never mutate data.

const MINUTE_PATTERN = /^(\d+)\s*min/i;

// Qualitative labels that are already safe to display as-is.
const QUALITATIVE_PASSTHROUGH = new Set([
  "à proximité",
  "dans le secteur",
  "accessible",
  "à vérifier",
  "proche",
  "à confirmer",
  "présence possible",
  "présence possible dans le secteur",
  "à proximité selon l'adresse",
  "à confirmer lors de la visite",
  "dépend de l'adresse exacte",
]);

function minutesToQualitativeLabel(minutes: number): string {
  if (minutes <= 5) return "à proximité";
  if (minutes <= 10) return "dans le secteur";
  if (minutes <= 15) return "accessible";
  return "à vérifier";
}

export type SanitizedProximityLabel = {
  display_label: string;
  is_estimated: boolean;
  should_show_exact_minutes: false;
};

/**
 * Converts a nearby place time string to a safe display label.
 *
 * - "6 min" → { display_label: "dans le secteur", is_estimated: true }
 * - "10 min à pied" → { display_label: "dans le secteur", is_estimated: true }
 * - "à proximité" → { display_label: "à proximité", is_estimated: false }
 * - "5 min" → { display_label: "à proximité", is_estimated: true }
 */
export function sanitizeNearbyPlaceTime(input: string): SanitizedProximityLabel {
  const trimmed = input.trim();

  // Already a safe qualitative label → pass through
  if (QUALITATIVE_PASSTHROUGH.has(trimmed.toLowerCase())) {
    return {
      display_label: trimmed,
      is_estimated: false,
      should_show_exact_minutes: false,
    };
  }

  // Matches "X min" or "X min à pied" or "Xmin" → convert to qualitative
  const match = trimmed.match(MINUTE_PATTERN);
  if (match) {
    const minutes = parseInt(match[1], 10);
    return {
      display_label: minutesToQualitativeLabel(minutes),
      is_estimated: true,
      should_show_exact_minutes: false,
    };
  }

  // Unknown / custom label → pass through without mutation
  return {
    display_label: trimmed,
    is_estimated: false,
    should_show_exact_minutes: false,
  };
}
