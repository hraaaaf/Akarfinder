import { canHaveInternalDetail } from "@/lib/listings/listing-boundary";
import { canPublishListingToPublicSurface } from "@/lib/listings/public-listing-access";
import type { Listing } from "@/lib/listings/types";

export function isSupportedPricePositionPropertyType(propertyType: Listing["property_type"]): propertyType is "Appartement" | "Villa" {
  return propertyType === "Appartement" || propertyType === "Villa";
}

export function canShowIndicativePricePosition(listing: Listing): boolean {
  const sourceName = listing.source_name?.trim() ?? "";

  return (
    canHaveInternalDetail(listing) &&
    isSupportedPricePositionPropertyType(listing.property_type) &&
    listing.city.trim().length > 0 &&
    listing.price > 0 &&
    listing.surface_m2 > 0 &&
    listing.price_per_m2 > 0 &&
    (sourceName.length === 0 || canPublishListingToPublicSurface(listing))
  );
}
