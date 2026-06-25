import type { Listing } from "./types";

export type ListingImageMode =
  | "real_image"       // partner_full + allowed — full-res photo from partner
  | "preview_image"    // preview_allowed + allowed — thumbnail/preview only
  | "fallback_visual"; // everything else — deterministic SVG scene

/**
 * Returns true only when the listing has explicit image rights AND
 * a real image URL to show. Never show real images for unknown/forbidden.
 */
export function canDisplayRealImage(listing: Listing): boolean {
  return (
    listing.image_permission_status === "allowed" &&
    (listing.source_access_level === "partner_full" ||
      listing.source_access_level === "preview_allowed") &&
    typeof listing.main_image_url === "string" &&
    listing.main_image_url.length > 0
  );
}

/**
 * Returns true only for partner_full listings with a gallery array.
 * preview_allowed partners may not host the full gallery.
 */
export function canDisplayGallery(listing: Listing): boolean {
  return (
    listing.image_permission_status === "allowed" &&
    listing.source_access_level === "partner_full" &&
    Array.isArray(listing.gallery_image_urls) &&
    listing.gallery_image_urls.length > 0
  );
}

/**
 * Determines how to render the listing's visual:
 * - "real_image"     → <Image src={listing.main_image_url} />
 * - "preview_image"  → <Image src={listing.main_image_url} /> with attribution
 * - "fallback_visual"→ <ListingVisual />
 */
export function getListingImageMode(listing: Listing): ListingImageMode {
  const permission = listing.image_permission_status ?? "unknown";
  const access = listing.source_access_level ?? "indexed_only";
  const hasUrl =
    typeof listing.main_image_url === "string" && listing.main_image_url.length > 0;

  if (permission !== "allowed") return "fallback_visual";
  if (access === "partner_full" && hasUrl) return "real_image";
  if (access === "preview_allowed" && hasUrl) return "preview_image";
  return "fallback_visual";
}

/**
 * Returns a human-readable attribution string when required,
 * or null when no attribution is needed (fallback visuals).
 */
export function getImageAttribution(listing: Listing): string | null {
  if (!listing.image_source) return null;
  return listing.image_source;
}
