import type { Listing } from "@/lib/listings/types";

export type SearchQuery = {
  q?: string;
  city?: string;
  property_type?: string;
  transaction_type?: string;
  minReliabilityScore?: number;
  reliability_badge?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export type SearchResult = {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  source: "database" | "typesense" | "database_fallback";
  generated_at: string;
};

export type TypesenseListingDocument = {
  id: string;
  title: string;
  city: string;
  district: string;
  property_type: string;
  transaction_type: string;
  price_mad: number;
  surface_m2: number;
  bedrooms_count: number;
  bathrooms_count: number;
  reliability_score: number;
  reliability_badge: string;
  data_completeness_score: number;
  duplicate_score: number;
  source_site: string;
  built_surface_m2?: number;
  plot_surface_m2?: number;
  condition?: string;
  property_age_range?: string;
  garden_m2?: number;
  terrace_m2?: number;
  garage_spaces?: number;
  has_pool: boolean;
  has_concierge: boolean;
  has_equipped_kitchen: boolean;
  premium_features: string[];
};
