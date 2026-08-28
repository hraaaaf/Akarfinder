import type { Listing } from "@/lib/listings/types";
import { getSearchCommercialTier } from "@/lib/search/search-commercial-priority";

/**
 * Public-indexed results always use AkarFinder-owned transaction artwork.
 * This intentionally overrides provider thumbnails and contextual photos for
 * this commercial tier only. Partner and first-party lanes keep their existing
 * authorized image policy untouched.
 */
export function shouldUseIndexedTransactionArtwork(listing: Listing): boolean {
  return getSearchCommercialTier(listing) === "public_indexed";
}
