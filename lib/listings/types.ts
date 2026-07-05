// P10IMG — image permission status (never show image if unknown or forbidden)
export type ImagePermissionStatus =
  | "allowed"         // rights confirmed (partner or explicit permission)
  | "source_link_only"// only an outbound link, no rehosting
  | "unknown"         // scraped without explicit permission — fallback required
  | "forbidden";      // source explicitly prohibits reuse

// P10IMG — how deeply this source can be surfaced
export type SourceAccessLevel =
  | "indexed_only"    // scraped/indexed; no gallery; link to source only
  | "preview_allowed" // thumbnail or preview OK; attribution required
  | "partner_full";   // agency/promoter/partner; full gallery + direct CTAs

// P10IMG — which SVG fallback scene to use when no real image is available
export type ImageFallbackType =
  | "apartment"
  | "villa"
  | "studio"
  | "terrain"
  | "bureau"
  | "new_project"
  | "generic";

// P10A — geo precision levels (never claim exact if uncertain)
export type GeoPrecision =
  | "exact"
  | "neighborhood_centroid"
  | "city_centroid"
  | "unknown";

// P10A — geo source identifiers
export type GeoSource =
  | "scraped_coordinates"
  | "neighborhood_centroid"
  | "city_centroid"
  | "manual_import"
  | "unknown";

export type ListingTransactionType = "buy" | "rent" | "new";

export type ListingPropertyType =
  | "Appartement"
  | "Villa"
  | "Terrain"
  | "Studio"
  | "Bureau"
  | "Maison";

export type ListingSourceType = "Source analysée" | "Agence" | "Promoteur";

export type ListingReliabilityLabel =
  | "Informations complètes"
  | "Infos limitées"
  | "Doublon possible";

export type Listing = {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  price: number;
  currency: "DH";
  surface_m2: number;
  price_per_m2: number;
  property_type: ListingPropertyType;
  transaction_type: ListingTransactionType;
  bedrooms: number;
  bathrooms: number;
  freshness_label: string;
  source_type: ListingSourceType;
  reliability_label: ListingReliabilityLabel;
  reliability_score: number;
  reliability_available?: boolean;
  is_mre_friendly: boolean;
  description: string;
  image_url: string;
  reliability_explanation: string;
  whatsapp?: string;
  price_mad?: number;
  district?: string;
  rooms_count?: number;
  bedrooms_count?: number;
  bathrooms_count?: number;
  description_snippet?: string;
  images_count?: number;
  seller_name?: string;

  // Level 2E - optional Zillow-style enrichment (mock, indicative).
  // When absent, lib/listings/enrichment.ts derives graceful indicative values.
  initial_price?: number;
  current_price?: number;
  price_change_percent?: number;
  listed_at_label?: string;
  updated_at_label?: string;
  market_position?: "coherent" | "high" | "low";
  market_min_price_per_m2?: number;
  market_max_price_per_m2?: number;
  nearby_places?: NearbyPlace[];
  neighborhood_summary?: string;
  remote_buying_notes?: string;
  similar_listing_ids?: string[];

  // P4 - populated for DB-backed listings, absent for mocks.
  data_completeness_score?: number;
  source_name?: string;
  listing_url?: string;

  // P5 - duplicate groups and reliability enrichment.
  duplicate_group_id?: string;
  duplicate_score?: number;
  reliability_badge?: string;
  reliability_reasons?: string[];

  // P10A — geo foundation fields (all optional; never invent exact coordinates).
  latitude?: number | null;
  longitude?: number | null;
  geo_label?: string;
  geo_precision?: GeoPrecision;
  geo_source?: GeoSource;

  // P10IMG — image metadata and permission model.
  // Rule: never show a real image unless image_permission_status === "allowed"
  // AND source_access_level === "partner_full" | "preview_allowed".
  main_image_url?: string | null;
  gallery_image_urls?: string[];
  image_source?: string | null;
  image_source_url?: string | null;
  image_permission_status?: ImagePermissionStatus;
  image_last_checked_at?: string | null;
  image_fallback_type?: ImageFallbackType;
  source_access_level?: SourceAccessLevel;

  // V9.5 — Source Display Policy (ENGINE-DISPLAY-POLICY-EXPORT-1, additive opt-in).
  // All fields optional — site works without them for legacy listings.
  source_display_type?: string;        // "public_index_source" | "partner_source" | "audit_source" | …
  source_badge?: string;               // "public_indexed" | "premium_partner" | "market_signal" | …
  display_depth?: string;              // "full" | "rich" | "limited_preview" | "market_signal_only" | …
  allowed_ctas?: string[];             // ["view_original", "view_source", "compare"] — gates CTA rendering
  thumbnail_policy?: string;           // "full_gallery_allowed" | "single_thumbnail_allowed" | "no_listing_image"
  display_policy_reason?: string;      // human-readable policy rationale
  original_source_required?: boolean;  // true → CTA must redirect to source, no copy
  source_attribution_label?: string;   // "Source publique indexée" | "Partenaire premium" | …
  display_images?: { policy?: string; urls?: string[] }; // policy-gated image view (≠ image_urls)
  reliability_info?: {                 // V9.5 reliability object — separate from reliability_badge (string)
    label?: string;
    score?: number | null;
    reasons?: string[];
  };

  // SEARCH-RESULT-DISPLAY-MODEL-1 — SERP display policy (additive, all optional).
  // Computed by computeSearchResultDisplayPolicy() in map-db-listing.ts.
  // Components must guard on can_show_result and production_allowed before rendering.
  search_result_display_mode?: string; // "full_partner_listing" | "indexed_result" | "thin_indexed_result" | …
  result_origin?: string;              // "direct_source" | "search_api" | "partner_feed" | …
  can_show_result?: boolean;           // false → never render in SERP (suppressed)
  can_show_thumbnail?: boolean;        // false → use fallback visual
  can_show_snippet?: boolean;          // false → hide description snippet
  can_show_contact?: boolean;          // false → no contact/WhatsApp CTA (always false outside partner)
  can_show_gallery?: boolean;          // false → no gallery (always false outside partner)
  primary_cta?: string;                // "view_original" | "view_source" | "view_full_listing" | "none"
  production_allowed?: boolean;        // false → gate in prod (e.g. ToS pending)
  production_block_reason?: string;    // "thumbnail_provider_tos_review_required" | "direct_avito_blocked" | …

  // MUBAWAB-DB-THUMBNAILS-RISK-ACCEPTED-1 — single public thumbnail (risk accepted, additive).
  // Render only when can_show_thumbnail=true AND NEXT_PUBLIC_DB_PROVIDER_THUMBNAILS_ENABLED=true.
  thumbnail_url?: string | null;       // remote URL only — never downloaded
  can_cache_thumbnail?: boolean;       // always false — never cache third-party images
  can_download_thumbnail?: boolean;    // always false — never download third-party images

  // P8A — advanced property characteristics (absent when not extracted).
  built_surface_m2?: number;
  plot_surface_m2?: number;
  condition?: string;
  property_age_range?: string;
  orientation?: string;
  floor_type?: string;
  floors_count?: number;
  garden_m2?: number;
  terrace_m2?: number;
  garage_spaces?: number;
  has_pool?: boolean;
  has_concierge?: boolean;
  has_moroccan_living_room?: boolean;
  has_european_living_room?: boolean;
  has_equipped_kitchen?: boolean;
  premium_features?: string[];
};

export type NearbyPlace = {
  label: string;
  time: string;
  icon:
    | "transport"
    | "school"
    | "shop"
    | "health"
    | "mosque"
    | "coast"
    | "station";
};

export type ListingFiltersState = {
  search: string;
  transactionType: "all" | ListingTransactionType;
  city: string;
  neighborhood: string;
  minBudget: string;
  maxBudget: string;
  minSurface: string;
  propertyType: "all" | ListingPropertyType;
  reliability: "all" | "top" | "high" | "medium" | "low";
  minReliabilityScore: number;
  mreOnly: boolean;
  packageScore: "all" | "bon";
};
