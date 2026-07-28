import type { Listing } from "@/lib/listings/types";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";

export type CertifiedPropertyMapPoint = {
  canonicalPropertyId: string;
  listing: Listing;
  x: number;
  y: number;
};

const MOROCCO_BOUNDS = {
  minLongitude: -17.2,
  maxLongitude: -0.8,
  minLatitude: 21,
  maxLatitude: 36,
} as const;

function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function hasCertifiedExactCoordinates(
  listing: Pick<Listing, "latitude" | "longitude" | "geo_precision" | "geo_source">,
): boolean {
  return (
    listing.geo_precision === "exact" &&
    (listing.geo_source === "scraped_coordinates" || listing.geo_source === "manual_import") &&
    isFiniteCoordinate(listing.latitude) &&
    isFiniteCoordinate(listing.longitude) &&
    listing.latitude >= MOROCCO_BOUNDS.minLatitude &&
    listing.latitude <= MOROCCO_BOUNDS.maxLatitude &&
    listing.longitude >= MOROCCO_BOUNDS.minLongitude &&
    listing.longitude <= MOROCCO_BOUNDS.maxLongitude
  );
}

export function projectCertifiedCoordinates(
  latitude: number,
  longitude: number,
): { x: number; y: number } {
  const x =
    ((longitude - MOROCCO_BOUNDS.minLongitude) /
      (MOROCCO_BOUNDS.maxLongitude - MOROCCO_BOUNDS.minLongitude)) *
    100;
  const y =
    (1 -
      (latitude - MOROCCO_BOUNDS.minLatitude) /
        (MOROCCO_BOUNDS.maxLatitude - MOROCCO_BOUNDS.minLatitude)) *
    100;

  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

export function buildCertifiedPropertyMapPoints(listings: Listing[]): CertifiedPropertyMapPoint[] {
  const points = new Map<string, CertifiedPropertyMapPoint>();

  for (const listing of listings) {
    if (!hasCertifiedExactCoordinates(listing)) continue;

    const canonicalPropertyId = getCanonicalPropertyId(listing);
    if (points.has(canonicalPropertyId)) continue;

    const projected = projectCertifiedCoordinates(listing.latitude!, listing.longitude!);
    points.set(canonicalPropertyId, {
      canonicalPropertyId,
      listing,
      ...projected,
    });
  }

  return [...points.values()];
}

export function certifiedMapInteractionChangesRanking(): false {
  return false;
}
