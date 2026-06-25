/**
 * Applies P10A geo enrichment to any array of listings.
 *
 * Only fills geo fields that are not already set (non-destructive).
 * For mock/demo listings the default is neighborhood_centroid or city_centroid —
 * NEVER "exact", since we never invented exact coordinates for demo data.
 */

import { resolveListingGeo } from "@/lib/geo/resolve-listing-geo";
import type { Listing } from "@/lib/listings/types";

/**
 * Returns a new array of listings where each item has geo fields resolved.
 * Existing geo fields on the listing are preserved (non-destructive merge).
 */
export function applyGeoEnrichment(listings: Listing[]): Listing[] {
  return listings.map((listing) => {
    // If geo_precision is already set, trust it and skip re-resolution.
    if (listing.geo_precision) return listing;

    const geo = resolveListingGeo(listing.city, listing.neighborhood);

    return {
      ...listing,
      latitude: listing.latitude ?? geo.latitude,
      longitude: listing.longitude ?? geo.longitude,
      geo_label: listing.geo_label ?? geo.geo_label,
      geo_precision: listing.geo_precision ?? geo.geo_precision,
      geo_source: listing.geo_source ?? geo.geo_source,
    };
  });
}
