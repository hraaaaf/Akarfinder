import type { GeoPrecision, GeoSource, Listing } from "@/lib/listings/types";

export const GEO_TRUTH_VERSION = "1.0" as const;

export type GeoTruthAvailability = "exact" | "context_only" | "unavailable";

export type GeoTruth = {
  version: typeof GEO_TRUTH_VERSION;
  listingId: string;
  availability: GeoTruthAvailability;
  precision: GeoPrecision;
  source: GeoSource;
  label: string | null;
  city: string | null;
  neighborhood: string | null;
  coordinate: { latitude: number; longitude: number } | null;
  exactOriginAllowed: boolean;
  legacyNearbyTimesTrusted: false;
  reason:
    | "exact_source_coordinates"
    | "context_centroid_only"
    | "coordinates_missing"
    | "coordinates_invalid"
    | "precision_unknown";
};

function finiteCoordinate(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export function buildGeoTruth(listing: Pick<
  Listing,
  "id" | "city" | "neighborhood" | "latitude" | "longitude" | "geo_precision" | "geo_source" | "geo_label"
>): GeoTruth {
  const precision = listing.geo_precision ?? "unknown";
  const source = listing.geo_source ?? "unknown";
  const coordinate = finiteCoordinate(listing.latitude, listing.longitude);
  const common = {
    version: GEO_TRUTH_VERSION,
    listingId: listing.id,
    precision,
    source,
    label: listing.geo_label?.trim() || null,
    city: listing.city?.trim() || null,
    neighborhood: listing.neighborhood?.trim() || null,
    legacyNearbyTimesTrusted: false as const,
  };

  if (!coordinate) {
    return {
      ...common,
      availability: "unavailable",
      coordinate: null,
      exactOriginAllowed: false,
      reason:
        listing.latitude == null && listing.longitude == null
          ? "coordinates_missing"
          : "coordinates_invalid",
    };
  }

  if (precision === "exact") {
    return {
      ...common,
      availability: "exact",
      coordinate,
      exactOriginAllowed: true,
      reason: "exact_source_coordinates",
    };
  }

  if (precision === "neighborhood_centroid" || precision === "city_centroid") {
    return {
      ...common,
      availability: "context_only",
      coordinate,
      exactOriginAllowed: false,
      reason: "context_centroid_only",
    };
  }

  return {
    ...common,
    availability: "unavailable",
    coordinate: null,
    exactOriginAllowed: false,
    reason: "precision_unknown",
  };
}

export function isExactGeoTruth(value: GeoTruth): value is GeoTruth & {
  availability: "exact";
  coordinate: { latitude: number; longitude: number };
  exactOriginAllowed: true;
} {
  return value.availability === "exact" && value.exactOriginAllowed && value.coordinate != null;
}
