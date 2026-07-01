// REAL-PROXIMITY-ENGINE-1 — Haversine distance + confidence utilities.

import type { RealProximityConfidence } from "./proximity-types";
import type { NeighborhoodCentroid } from "./neighborhood-centroids";
import { NEIGHBORHOOD_CENTROIDS } from "./neighborhood-centroids";

/** Haversine distance between two GPS points, in meters. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Average walking speed: 80 m/min (~4.8 km/h). */
export function metersToWalkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

/**
 * Maps listing-to-centroid distance to confidence level.
 * <500m  → high (listing is well inside the neighborhood)
 * <2000m → medium (listing is in the general area)
 * ≥2000m → low (centroid may not represent the listing location)
 */
export function distanceToConfidence(distanceMeters: number): RealProximityConfidence {
  if (distanceMeters <= 500) return "high";
  if (distanceMeters < 2000) return "medium";
  return "low";
}

export type NearestCentroid = NeighborhoodCentroid & { distanceMeters: number };

/**
 * Finds the neighborhood centroid closest to the given GPS coordinates.
 * Returns null if the dataset is empty.
 */
export function findNearestCentroid(lat: number, lng: number): NearestCentroid | null {
  if (NEIGHBORHOOD_CENTROIDS.length === 0) return null;

  let nearest = NEIGHBORHOOD_CENTROIDS[0];
  let nearestDist = haversineMeters(lat, lng, nearest.lat, nearest.lng);

  for (const centroid of NEIGHBORHOOD_CENTROIDS.slice(1)) {
    const dist = haversineMeters(lat, lng, centroid.lat, centroid.lng);
    if (dist < nearestDist) {
      nearest = centroid;
      nearestDist = dist;
    }
  }

  return { ...nearest, distanceMeters: nearestDist };
}
