// PUBLIC-READMODEL-AUTHORIZED-ONLY-1
// Guards for the public read-model: only first_party and partner_authorized
// sources may be published as structured AkarFinder listings.
//
// Rule: third_party_legacy, public_external_live, benchmark_source, and unknown
// sources are never exposed as structured listings on public surfaces.
//
// This module wraps the Source Access Registry for use with Listing objects.

import {
  canPublishStructuredListing,
} from "@/lib/sources/source-access-registry";
import type { Listing } from "@/lib/listings/types";
import type { DbListingRow } from "@/lib/listings/db-listings";

/**
 * Returns true only when the listing's source is first_party or partner_authorized.
 * All other sources (third_party_legacy, public_external_live, benchmark_source,
 * or unknown) are suppressed from public structured surfaces.
 *
 * Use this guard on Listing objects (after mapDbRowToListing).
 */
export function canPublishListingToPublicSurface(listing: Listing): boolean {
  return canPublishStructuredListing(listing.source_name ?? "");
}

/**
 * Lightweight variant for use before mapDbRowToListing (raw DB row).
 * Avoids the full mapping cost when bulk-filtering at the DB layer.
 */
export function canPublishDbRowToPublicSurface(row: DbListingRow): boolean {
  return canPublishStructuredListing(row.source_name ?? "");
}
