import type { Listing } from "@/lib/listings/types";
import type { TypesenseListingDocument } from "./types";

function optionalNumber(value: number | undefined) {
  return value != null ? value : undefined;
}

export function mapListingToTypesenseDocument(
  listing: Listing
): TypesenseListingDocument {
  return {
    id: listing.id,
    title: listing.title,
    city: listing.city,
    district: listing.district ?? listing.neighborhood ?? "",
    property_type: listing.property_type,
    transaction_type: listing.transaction_type,
    price_mad: listing.price_mad ?? listing.price,
    surface_m2: listing.surface_m2,
    bedrooms_count: listing.bedrooms_count ?? listing.bedrooms,
    bathrooms_count: listing.bathrooms_count ?? listing.bathrooms,
    reliability_score: listing.reliability_score,
    reliability_badge: listing.reliability_badge ?? listing.reliability_label,
    data_completeness_score: listing.data_completeness_score ?? 0,
    duplicate_score: listing.duplicate_score ?? 0,
    source_site: listing.source_name ?? listing.source_type,
    built_surface_m2: optionalNumber(listing.built_surface_m2),
    plot_surface_m2: optionalNumber(listing.plot_surface_m2),
    condition: listing.condition,
    property_age_range: listing.property_age_range,
    garden_m2: optionalNumber(listing.garden_m2),
    terrace_m2: optionalNumber(listing.terrace_m2),
    garage_spaces: optionalNumber(listing.garage_spaces),
    has_pool: listing.has_pool === true,
    has_concierge: listing.has_concierge === true,
    has_equipped_kitchen: listing.has_equipped_kitchen === true,
    premium_features: listing.premium_features ?? [],
  };
}
