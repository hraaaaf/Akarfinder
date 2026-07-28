import type { NeighborhoodGeometryRecord } from "@/lib/geo/neighborhood-geometry-registry";

export const CASABLANCA_GEOMETRY_SOURCE_POLICY = {
  provider: "OpenStreetMap contributors",
  dataset: "OpenStreetMap database",
  licenseId: "ODbL-1.0",
  licenseUrl: "https://www.openstreetmap.org/copyright",
  attribution: "© OpenStreetMap contributors",
  usageMode: "shadow-only",
  notes: [
    "No geometry is published until source identity, licence, canonical district mapping and topology review pass.",
    "A missing geometry remains missing; the registry must never synthesize or approximate neighborhood borders.",
    "Any public produced work must surface the required attribution.",
  ],
} as const;

/**
 * Intentionally empty at LOT start.
 * Records are added only after an auditable extraction and manual canonical review.
 */
export const CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW: readonly NeighborhoodGeometryRecord[] = [];

export function listCasablancaShadowGeometries(): readonly NeighborhoodGeometryRecord[] {
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW;
}
