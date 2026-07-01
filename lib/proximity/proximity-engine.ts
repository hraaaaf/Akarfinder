// REAL-PROXIMITY-ENGINE-1
// Computes a real proximity profile for a listing based on available location data.
//
// Level 1 (city only / unknown): qualitative labels, low confidence
// Level 2 (district):            qualitative labels, medium confidence
// Level 3 (exact GPS):           estimated minutes possible, high confidence
//
// Data source: static OSM-derived dataset (morocco-proximity.ts).
// No live API calls in production.

import type {
  ProximityEngineInput,
  RealProximityProfile,
  RealPoiItem,
  RealPoiType,
  ProximitySource,
  RealProximityConfidence,
} from "./proximity-types";
import type { ProximityPoint, ProximityCategory } from "./types";
import { NEIGHBORHOOD_PROXIMITY, CITY_PROXIMITY } from "./morocco-proximity";
import { findNearestCentroid, distanceToConfidence } from "./proximity-confidence";
import {
  minutesToQualitative,
  formatWalkingLabel,
  PROXIMITY_DISCLAIMER,
  PROXIMITY_DISCLAIMER_GPS,
  basisToSourceLabel,
} from "./proximity-format";

// ─────────────────────────────────────────────────────────────────
// Category / confidence mappers
// ─────────────────────────────────────────────────────────────────

const CATEGORY_TO_POI_TYPE: Record<ProximityCategory, RealPoiType> = {
  transport:    "transport",
  taxi:         "transport",
  ecole:        "school",
  supermarche:  "supermarket",
  mosquee:      "mosque",
  clinique:     "clinic",
  pharmacie:    "pharmacy",
  marche_souk:  "market",
  hanout:       "market",
  cafe:         "cafe",
  espace_vert:  "park",
  banque:       "bank",
  parking:      "parking",
};

function mapConfidence(c: ProximityPoint["confidence"]): RealProximityConfidence {
  if (c === "élevé") return "high";
  if (c === "moyen") return "medium";
  return "low";
}

// ─────────────────────────────────────────────────────────────────
// String normalization (same logic as get-listing-proximity.ts)
// ─────────────────────────────────────────────────────────────────

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────────────
// ProximityPoint → RealPoiItem conversion
// ─────────────────────────────────────────────────────────────────

function toRealPoiItem(
  point: ProximityPoint,
  basis: RealProximityProfile["basis"],
  overrideConfidence?: RealProximityConfidence,
  source: ProximitySource = "osm_static"
): RealPoiItem {
  const confidence = overrideConfidence ?? mapConfidence(point.confidence);
  const display_label = formatWalkingLabel(point.distance_minutes, confidence, basis);

  return {
    type: CATEGORY_TO_POI_TYPE[point.category] ?? "other",
    label: point.label,
    walking_minutes: basis === "exact_gps" && confidence === "high"
      ? point.distance_minutes
      : undefined,
    display_label,
    source,
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────
// Level 1 — City only
// ─────────────────────────────────────────────────────────────────

function computeCityProfile(city: string): RealProximityProfile {
  const points = CITY_PROXIMITY[normalize(city)] ?? [];

  return {
    confidence: "low",
    basis: "city_only",
    items: points.map((p) => ({
      type: CATEGORY_TO_POI_TYPE[p.category] ?? "other",
      label: p.label,
      walking_minutes: undefined,
      display_label: minutesToQualitative(p.distance_minutes),
      source: "osm_static" as ProximitySource,
      confidence: "low" as RealProximityConfidence,
    })),
    disclaimer: PROXIMITY_DISCLAIMER,
  };
}

// ─────────────────────────────────────────────────────────────────
// Level 2 — District / neighborhood
// ─────────────────────────────────────────────────────────────────

function computeDistrictProfile(district: string, city?: string): RealProximityProfile {
  const districtKey = normalize(district);
  const points = NEIGHBORHOOD_PROXIMITY[districtKey];

  if (points) {
    return {
      confidence: "medium",
      basis: "district_centroid",
      items: points.map((p) => ({
        type: CATEGORY_TO_POI_TYPE[p.category] ?? "other",
        label: p.label,
        walking_minutes: undefined,
        display_label: minutesToQualitative(p.distance_minutes),
        source: "osm_static" as ProximitySource,
        confidence: "medium" as RealProximityConfidence,
      })),
      disclaimer: PROXIMITY_DISCLAIMER,
    };
  }

  // District not in dataset → city fallback
  if (city) return computeCityProfile(city);
  return UNKNOWN_PROFILE;
}

// ─────────────────────────────────────────────────────────────────
// Level 3 — Exact GPS
// ─────────────────────────────────────────────────────────────────

function computeGpsProfile(input: ProximityEngineInput): RealProximityProfile {
  const lat = input.latitude!;
  const lng = input.longitude!;

  const nearest = findNearestCentroid(lat, lng);

  // More than 5 km from any known centroid → degrade to district or city
  if (!nearest || nearest.distanceMeters > 5000) {
    if (input.district) return computeDistrictProfile(input.district, input.city);
    if (input.city) return computeCityProfile(input.city);
    return UNKNOWN_PROFILE;
  }

  const gpsConfidence = distanceToConfidence(nearest.distanceMeters);
  const points = NEIGHBORHOOD_PROXIMITY[nearest.neighborhood] ?? [];

  if (points.length === 0) {
    // Centroid matched but no POI data → city fallback
    if (input.city) return computeCityProfile(input.city);
    return UNKNOWN_PROFILE;
  }

  return {
    confidence: gpsConfidence,
    basis: "exact_gps",
    items: points.map((p) => toRealPoiItem(p, "exact_gps", gpsConfidence, "gps_computed")),
    disclaimer: PROXIMITY_DISCLAIMER_GPS,
  };
}

// ─────────────────────────────────────────────────────────────────
// Fallback profile (no data available)
// ─────────────────────────────────────────────────────────────────

const UNKNOWN_PROFILE: RealProximityProfile = {
  confidence: "low",
  basis: "unknown",
  items: [],
  disclaimer: PROXIMITY_DISCLAIMER,
};

// ─────────────────────────────────────────────────────────────────
// Main engine
// ─────────────────────────────────────────────────────────────────

/**
 * Computes a real proximity profile for a listing.
 *
 * Priority:
 * 1. Exact GPS → matched to nearest neighborhood centroid
 * 2. Known district → neighborhood dataset lookup
 * 3. City only → city dataset lookup
 * 4. Unknown → empty profile with disclaimer
 */
export function computeRealProximityProfile(
  input: ProximityEngineInput
): RealProximityProfile {
  if (
    input.location_precision === "exact_gps" &&
    input.latitude != null &&
    input.longitude != null
  ) {
    return computeGpsProfile(input);
  }

  if (input.district) {
    return computeDistrictProfile(input.district, input.city);
  }

  if (input.city) {
    return computeCityProfile(input.city);
  }

  return UNKNOWN_PROFILE;
}

/** Infer engine input from a Listing object. */
export function inferProximityInput(listing: {
  city?: string;
  neighborhood?: string;
  latitude?: number | null;
  longitude?: number | null;
  geo_precision?: string;
}): ProximityEngineInput {
  const geoPrec = listing.geo_precision;

  let location_precision: ProximityEngineInput["location_precision"] = "unknown";
  if (geoPrec === "exact") location_precision = "exact_gps";
  else if (geoPrec === "neighborhood_centroid") location_precision = "district";
  else if (geoPrec === "city_centroid") location_precision = "city";

  return {
    city: listing.city,
    district: listing.neighborhood,
    latitude: listing.latitude,
    longitude: listing.longitude,
    location_precision,
  };
}

// Re-export for consumers
export { basisToSourceLabel, confidenceLabel } from "./proximity-format";
export type { RealProximityProfile, RealPoiItem, ProximityEngineInput } from "./proximity-types";
