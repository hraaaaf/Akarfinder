// P10C — Resolve indicative proximity points for a listing.
// Strategy: normalize → try neighborhood → try city → return [].
// No live API calls, no geocoding, no DB reads.

import type { ProximityPoint } from "@/lib/proximity/types";
import {
  CITY_PROXIMITY,
  NEIGHBORHOOD_PROXIMITY,
} from "@/lib/proximity/morocco-proximity";

/**
 * Normalize a string for lookup:
 * - lowercase
 * - remove diacritics (é→e, â→a, etc.)
 * - collapse extra whitespace
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return indicative proximity points for a listing's city and neighborhood.
 *
 * Lookup order:
 * 1. Normalized neighborhood key in NEIGHBORHOOD_PROXIMITY
 * 2. Normalized city key in CITY_PROXIMITY
 * 3. Empty array (never invent data)
 *
 * All returned data is static and indicative — label with
 * "Données indicatives — à vérifier avant décision".
 */
export function getListingProximity(
  city: string,
  neighborhood?: string
): ProximityPoint[] {
  if (neighborhood) {
    const neighborhoodKey = normalize(neighborhood);
    if (NEIGHBORHOOD_PROXIMITY[neighborhoodKey]) {
      return NEIGHBORHOOD_PROXIMITY[neighborhoodKey];
    }
  }

  const cityKey = normalize(city);
  if (CITY_PROXIMITY[cityKey]) {
    return CITY_PROXIMITY[cityKey];
  }

  return [];
}
