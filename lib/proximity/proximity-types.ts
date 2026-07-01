// REAL-PROXIMITY-ENGINE-1 — Unified types for the real proximity engine.
// Distinct from the existing ProximityPoint (OSM static dataset).
// This models the engine's OUTPUT, consumed by ProximityBlock.

export type LocationPrecision = "exact_gps" | "district" | "city" | "unknown";

export type ProximitySource =
  | "osm_static"     // Static OSM-derived dataset (morocco-proximity.ts)
  | "manual_curated" // Manually verified/curated entry
  | "gps_computed"   // Computed from listing GPS + nearest centroid
  | "unknown";       // No source metadata available

export type RealProximityConfidence = "high" | "medium" | "low";

export type RealPoiType =
  | "transport"
  | "school"
  | "supermarket"
  | "mosque"
  | "clinic"
  | "pharmacy"
  | "train_station"
  | "beach"
  | "market"
  | "cafe"
  | "park"
  | "bank"
  | "parking"
  | "other";

export type RealPoiItem = {
  type: RealPoiType;
  label: string;
  distance_meters?: number;
  walking_minutes?: number;      // Only set when source/confidence warrants it
  display_label: string;         // Ready-to-display label (qualitative or timed)
  source: ProximitySource;
  confidence: RealProximityConfidence;
};

export type RealProximityBasis =
  | "exact_gps"         // Listing has confirmed GPS coords, matched to nearest centroid
  | "district_centroid" // Based on neighborhood/district name lookup
  | "city_only"         // Only city-level data available
  | "unknown";          // No geographic basis

export type RealProximityProfile = {
  confidence: RealProximityConfidence;
  basis: RealProximityBasis;
  items: RealPoiItem[];
  disclaimer: string;
};

export type ProximityEngineInput = {
  city?: string;
  district?: string;
  latitude?: number | null;
  longitude?: number | null;
  listing_source?: string;
  location_precision: LocationPrecision;
};
