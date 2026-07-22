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
  // SEARCH-INDEX-DEPTH-V1 — opaque raw-index cursor used by the database
  // fallback for deep pagination. `offset` remains supported for legacy callers.
  cursor?: number;
  min_price?: number;
  max_price?: number;
  min_surface?: number;
  max_surface?: number;
};

export type SearchResult = {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  source: "database" | "typesense" | "database_fallback";
  generated_at: string;
  // Additive pagination metadata. Typesense/legacy callers may omit it.
  next_cursor?: number | null;
  has_more?: boolean;
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
