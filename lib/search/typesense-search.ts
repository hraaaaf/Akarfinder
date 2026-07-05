import type { Listing } from "@/lib/listings/types";
import type { SearchQuery, SearchResult, TypesenseListingDocument } from "./types";
import { searchTypesenseDocuments } from "./typesense-client";

function documentToListing(document: TypesenseListingDocument): Listing {
  const pricePerM2 =
    document.price_mad > 0 && document.surface_m2 > 0
      ? Math.round(document.price_mad / document.surface_m2)
      : 0;

  return {
    id: document.id,
    title: document.title,
    city: document.city,
    neighborhood: document.district,
    price: document.price_mad,
    price_mad: document.price_mad,
    currency: "DH",
    surface_m2: document.surface_m2,
    price_per_m2: pricePerM2,
    property_type: document.property_type as Listing["property_type"],
    transaction_type: document.transaction_type as Listing["transaction_type"],
    bedrooms: document.bedrooms_count,
    bathrooms: document.bathrooms_count,
    bedrooms_count: document.bedrooms_count,
    bathrooms_count: document.bathrooms_count,
    freshness_label: "Mise a jour recente",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: document.reliability_score,
    reliability_available: true,
    is_mre_friendly: false,
    description: "",
    image_url: "",
    reliability_explanation:
      "Score calcule sur la completude, la coherence des donnees et la presence de doublons.",
    data_completeness_score: document.data_completeness_score,
    source_name: document.source_site,
    duplicate_score: document.duplicate_score,
    reliability_badge: document.reliability_badge,
    built_surface_m2: document.built_surface_m2,
    plot_surface_m2: document.plot_surface_m2,
    condition: document.condition,
    property_age_range: document.property_age_range,
    garden_m2: document.garden_m2,
    terrace_m2: document.terrace_m2,
    garage_spaces: document.garage_spaces,
    has_pool: document.has_pool,
    has_concierge: document.has_concierge,
    has_equipped_kitchen: document.has_equipped_kitchen,
    premium_features: document.premium_features,
  };
}

export async function searchTypesense(query: SearchQuery): Promise<SearchResult> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);
  const result = await searchTypesenseDocuments({ ...query, limit, offset });

  return {
    listings: result.documents.map(documentToListing),
    total: result.total,
    limit,
    offset,
    source: "typesense",
    generated_at: new Date().toISOString(),
  };
}
