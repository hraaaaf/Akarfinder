/**
 * Geo resolution for AkarFinder listings.
 *
 * Rules (in priority order):
 * 1. Known neighborhood → neighborhood_centroid
 * 2. Known city only   → city_centroid
 * 3. Neither known     → unknown / null coordinates
 *
 * IMPORTANT: never invent an exact position.
 * If uncertain, return null coordinates and geo_precision = "unknown".
 */

import type { GeoPrecision, GeoSource } from "@/lib/listings/types";
import {
  getCityCentroid,
  getNeighborhoodCentroid,
} from "@/lib/geo/morocco-centroids";

export type ResolvedGeo = {
  latitude: number | null;
  longitude: number | null;
  geo_label: string;
  geo_precision: GeoPrecision;
  geo_source: GeoSource;
};

/**
 * Resolve geo fields for a listing given its city and optional neighborhood.
 * Returns null coordinates when location is too vague or unknown.
 */
export function resolveListingGeo(
  city: string | null | undefined,
  neighborhood: string | null | undefined
): ResolvedGeo {
  // ── 1. Try neighborhood centroid first ──────────────────────────────────────
  if (city && neighborhood) {
    const nbCentroid = getNeighborhoodCentroid(city, neighborhood);
    if (nbCentroid) {
      return {
        latitude: nbCentroid.lat,
        longitude: nbCentroid.lng,
        geo_label: `${neighborhood}, ${city}`,
        geo_precision: "neighborhood_centroid",
        geo_source: "neighborhood_centroid",
      };
    }
  }

  // ── 2. Fall back to city centroid ───────────────────────────────────────────
  if (city) {
    const cityCentroid = getCityCentroid(city);
    if (cityCentroid) {
      const label = neighborhood ? `${neighborhood}, ${city}` : city;
      return {
        latitude: cityCentroid.lat,
        longitude: cityCentroid.lng,
        geo_label: label,
        geo_precision: "city_centroid",
        geo_source: "city_centroid",
      };
    }
  }

  // ── 3. Unknown — do not invent a position ───────────────────────────────────
  return {
    latitude: null,
    longitude: null,
    geo_label: city ?? "Localisation inconnue",
    geo_precision: "unknown",
    geo_source: "unknown",
  };
}

/**
 * Return user-facing wording for a geo_precision value.
 * Always honest — never overpromise accuracy.
 */
export function getGeoPrecisionLabel(precision: GeoPrecision | undefined): string {
  switch (precision) {
    case "exact":
      return "Position exacte";
    case "neighborhood_centroid":
      return "Position approximative — quartier";
    case "city_centroid":
      return "Position approximative — ville";
    case "unknown":
    default:
      return "Position non disponible";
  }
}
