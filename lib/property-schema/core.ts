export const PROPERTY_SCHEMA_VERSION = "1.0" as const;

export type ProvenanceKind =
  | "DECLARED"
  | "VERIFIED_DOCUMENT"
  | "DERIVED_GEO"
  | "DERIVED_MARKET"
  | "INFERRED";

export type FactConfidence = "high" | "medium" | "low" | "unknown";
export type FactVerificationStatus = "unverified" | "consistent" | "verified" | "disputed";
export type FactVisibility = "PUBLIC" | "PARTNER_ONLY" | "INTERNAL" | "SUPPRESSED";
export type AcquisitionChannel =
  | "partner_api"
  | "partner_feed"
  | "manual_partner"
  | "first_party_user"
  | "source_page"
  | "search_result"
  | "document"
  | "system";

export type CanonicalFact<T> = {
  value: T | null;
  provenance: ProvenanceKind;
  confidence: FactConfidence;
  observed_at: string | null;
  source_ref: string | null;
  verification_status: FactVerificationStatus;
  visibility: FactVisibility;
};

export function fact<T>(
  value: T | null,
  options: Partial<Omit<CanonicalFact<T>, "value">> = {},
): CanonicalFact<T> {
  return {
    value,
    provenance: options.provenance ?? "DECLARED",
    confidence: options.confidence ?? (value == null ? "unknown" : "medium"),
    observed_at: options.observed_at ?? null,
    source_ref: options.source_ref ?? null,
    verification_status: options.verification_status ?? "unverified",
    visibility: options.visibility ?? "PUBLIC",
  };
}

export type CanonicalPropertyType =
  | "apartment"
  | "villa"
  | "house"
  | "studio"
  | "duplex"
  | "riad"
  | "land"
  | "office"
  | "commercial"
  | "warehouse"
  | "industrial"
  | "farm"
  | "building"
  | "other"
  | "unknown";

export type CanonicalTransactionType = "sale" | "rent";
export type MarketSegment = "resale" | "new_build" | "off_plan" | "unknown";
export type PropertyCanonicalStatus = "active" | "inactive" | "merged" | "disputed" | "unknown";
export type GeoPrecision = "exact" | "neighborhood_centroid" | "city_centroid" | "unknown";
export type GeoSource = "declared" | "scraped_coordinates" | "neighborhood_centroid" | "city_centroid" | "manual" | "unknown";

export interface CanonicalPropertyFactsV1 {
  classification: {
    property_type: CanonicalFact<CanonicalPropertyType>;
    property_subtype?: CanonicalFact<string>;
    market_segment: CanonicalFact<MarketSegment>;
    usage_type?: CanonicalFact<"residential" | "commercial" | "mixed" | "agricultural" | "industrial" | "unknown">;
    occupancy_status?: CanonicalFact<"vacant" | "owner_occupied" | "tenant_occupied" | "unknown">;
    construction_status?: CanonicalFact<"completed" | "under_construction" | "planned" | "unknown">;
  };
  location: {
    country: CanonicalFact<string>;
    region?: CanonicalFact<string>;
    province_prefecture?: CanonicalFact<string>;
    city: CanonicalFact<string>;
    district?: CanonicalFact<string>;
    neighborhood?: CanonicalFact<string>;
    sub_neighborhood?: CanonicalFact<string>;
    residence_name?: CanonicalFact<string>;
    street_name?: CanonicalFact<string>;
    address_display?: CanonicalFact<string>;
    address_private?: CanonicalFact<string>;
    postal_code?: CanonicalFact<string>;
    latitude?: CanonicalFact<number>;
    longitude?: CanonicalFact<number>;
    geo_precision: CanonicalFact<GeoPrecision>;
    geo_source: CanonicalFact<GeoSource>;
    location_landmark?: CanonicalFact<string>;
    location_notes?: CanonicalFact<string>;
  };
  surfaces: {
    surface_total_m2?: CanonicalFact<number>;
    surface_habitable_m2?: CanonicalFact<number>;
    surface_built_m2?: CanonicalFact<number>;
    surface_land_m2?: CanonicalFact<number>;
    terrace_m2?: CanonicalFact<number>;
    balcony_m2?: CanonicalFact<number>;
    garden_m2?: CanonicalFact<number>;
    roof_terrace_m2?: CanonicalFact<number>;
    frontage_m?: CanonicalFact<number>;
    land_depth_m?: CanonicalFact<number>;
    ceiling_height_m?: CanonicalFact<number>;
    usable_area_m2?: CanonicalFact<number>;
    common_area_m2?: CanonicalFact<number>;
    surface_notes?: CanonicalFact<string>;
  };
  layout: {
    rooms_count?: CanonicalFact<number>;
    bedrooms_count?: CanonicalFact<number>;
    bathrooms_count?: CanonicalFact<number>;
    shower_rooms_count?: CanonicalFact<number>;
    toilets_count?: CanonicalFact<number>;
    living_rooms_count?: CanonicalFact<number>;
    moroccan_living_rooms_count?: CanonicalFact<number>;
    european_living_rooms_count?: CanonicalFact<number>;
    kitchens_count?: CanonicalFact<number>;
    kitchen_type?: CanonicalFact<string>;
    balconies_count?: CanonicalFact<number>;
    terraces_count?: CanonicalFact<number>;
    storage_rooms_count?: CanonicalFact<number>;
    maid_rooms_count?: CanonicalFact<number>;
  };
  building: {
    construction_year?: CanonicalFact<number>;
    property_age_range?: CanonicalFact<string>;
    floor_number?: CanonicalFact<number>;
    floors_count?: CanonicalFact<number>;
    units_in_building?: CanonicalFact<number>;
    orientation?: CanonicalFact<string>;
    exposure?: CanonicalFact<string>;
    view_type?: CanonicalFact<string>;
    architecture_style?: CanonicalFact<string>;
    floor_type?: CanonicalFact<string>;
    ceiling_type?: CanonicalFact<string>;
    facade_condition?: CanonicalFact<string>;
    common_areas_condition?: CanonicalFact<string>;
    elevator_count?: CanonicalFact<number>;
  };
  features: {
    has_elevator?: CanonicalFact<boolean>;
    has_parking?: CanonicalFact<boolean>;
    parking_spaces?: CanonicalFact<number>;
    parking_type?: CanonicalFact<string>;
    has_garage?: CanonicalFact<boolean>;
    garage_spaces?: CanonicalFact<number>;
    has_pool?: CanonicalFact<boolean>;
    pool_type?: CanonicalFact<string>;
    has_garden?: CanonicalFact<boolean>;
    has_terrace?: CanonicalFact<boolean>;
    has_balcony?: CanonicalFact<boolean>;
    has_concierge?: CanonicalFact<boolean>;
    has_security?: CanonicalFact<boolean>;
    has_gated_access?: CanonicalFact<boolean>;
    has_equipped_kitchen?: CanonicalFact<boolean>;
    has_air_conditioning?: CanonicalFact<boolean>;
    has_heating?: CanonicalFact<boolean>;
    has_fireplace?: CanonicalFact<boolean>;
    has_solar_panels?: CanonicalFact<boolean>;
    has_water_tank?: CanonicalFact<boolean>;
    has_well?: CanonicalFact<boolean>;
    has_storage?: CanonicalFact<boolean>;
    has_cellar?: CanonicalFact<boolean>;
    is_furnished?: CanonicalFact<boolean>;
    furnishing_level?: CanonicalFact<string>;
    premium_features?: CanonicalFact<string[]>;
  };
  condition: {
    condition?: CanonicalFact<string>;
    renovation_status?: CanonicalFact<string>;
    renovation_year?: CanonicalFact<number>;
    finish_level?: CanonicalFact<string>;
    quality_tier?: CanonicalFact<string>;
    structural_condition?: CanonicalFact<string>;
    interior_condition?: CanonicalFact<string>;
    exterior_condition?: CanonicalFact<string>;
    availability_condition?: CanonicalFact<string>;
    condition_notes?: CanonicalFact<string>;
  };
  land: {
    zoning_type?: CanonicalFact<string>;
    constructible_status?: CanonicalFact<string>;
    allowed_land_use?: CanonicalFact<string>;
    facade_count?: CanonicalFact<number>;
    road_access_width_m?: CanonicalFact<number>;
    land_shape?: CanonicalFact<string>;
    land_slope?: CanonicalFact<string>;
    utilities_water?: CanonicalFact<boolean>;
    utilities_electricity?: CanonicalFact<boolean>;
    utilities_sewer?: CanonicalFact<boolean>;
    subdivision_status?: CanonicalFact<string>;
  };
  legal: {
    title_status?: CanonicalFact<string>;
    title_deed_available?: CanonicalFact<boolean>;
    ownership_type?: CanonicalFact<string>;
    cadastral_reference_available?: CanonicalFact<boolean>;
    building_permit_status?: CanonicalFact<string>;
    occupancy_permit_status?: CanonicalFact<string>;
    coownership_status?: CanonicalFact<string>;
    coownership_rules_available?: CanonicalFact<boolean>;
    mortgage_status_declared?: CanonicalFact<string>;
    encumbrance_status_declared?: CanonicalFact<string>;
    legal_documents_available?: CanonicalFact<boolean>;
    documents_verified_count?: CanonicalFact<number>;
    legal_verification_status?: CanonicalFact<string>;
    legal_notes?: CanonicalFact<string>;
  };
}

export type PriceStatus = "valid" | "not_disclosed" | "ambiguous" | "unavailable" | "invalid";
export type OfferAvailabilityStatus = "available" | "upcoming" | "reserved" | "sold" | "rented" | "withdrawn" | "unknown";
export type OfferComplianceStatus = "allowed" | "restricted" | "review_required" | "blocked";
export type OfferOriginType = "partner_api" | "partner_feed" | "first_party_user" | "persisted_openserp" | "authorized_static_page" | "legacy_import" | "unknown";

export interface CanonicalOfferV1 {
  offer_id: string;
  property_id: string;
  source_id: string;
  source_name: string;
  external_offer_id: string | null;
  source_url: string | null;
  canonical_source_url: string | null;
  acquisition_channel: AcquisitionChannel;
  origin_type: OfferOriginType;
  transaction_type: CanonicalTransactionType;
  title: CanonicalFact<string>;
  description: CanonicalFact<string>;
  price_amount: CanonicalFact<number>;
  price_currency: "MAD";
  price_period: "total" | "month" | "day" | "unknown";
  price_status: PriceStatus;
  deposit_amount?: CanonicalFact<number>;
  agency_fee?: CanonicalFact<number>;
  monthly_charges?: CanonicalFact<number>;
  syndic_fee?: CanonicalFact<number>;
  negotiable_declared?: CanonicalFact<boolean>;
  availability_status: OfferAvailabilityStatus;
  available_from?: CanonicalFact<string>;
  seller_type?: CanonicalFact<"owner" | "agency" | "promoter" | "broker" | "unknown">;
  seller_organization_id?: string | null;
  published_at_source: string | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
  updated_at_source: string | null;
  offer_status: "active" | "inactive" | "deleted" | "unpublished" | "unknown";
  compliance_status: OfferComplianceStatus;
  media_set_id: string | null;
  ingestion_run_id: string | null;
}

export interface MediaAssetV1 {
  media_id: string;
  property_id: string;
  offer_id: string | null;
  type: "image" | "video" | "floor_plan" | "document";
  url: string;
  source_url: string | null;
  rights_status: "allowed" | "source_link_only" | "unknown" | "forbidden";
  publication_permission: "allowed" | "partner_only" | "forbidden" | "unknown";
  cache_permission: boolean;
  download_permission: boolean;
  attribution: string | null;
  observed_at: string | null;
  last_checked_at: string | null;
}

export interface PropertyIntelligenceV1 {
  property_id: string;
  computed_at: string;
  price_per_m2: number | null;
  price_per_m2_method: "price_divided_by_surface" | "unavailable";
  market_position: "below_market" | "near_market" | "above_market" | "overpriced" | "insufficient_data" | null;
  market_reference_id: string | null;
  data_completeness_score: number | null;
  freshness_score: number | null;
  duplicate_score: number | null;
  anomaly_score: number | null;
  akar_score: number | null;
  listing_conclusion: string | null;
  property_fit_score: number | null;
  investment_score: number | null;
  mre_score: number | null;
}

export interface OfferDisplayPolicyV1 {
  offer_id: string;
  can_show_result: boolean;
  can_show_thumbnail: boolean;
  can_show_gallery: boolean;
  can_show_contact: boolean;
  can_show_snippet: boolean;
  primary_cta: "view_original" | "view_source" | "view_full_listing" | "none";
  allowed_ctas: string[];
  source_badge: string | null;
  display_depth: "full" | "rich" | "limited_preview" | "market_signal_only" | "hidden";
  production_allowed: boolean;
  block_reason: string | null;
}

export interface CanonicalPropertyV1 {
  property_id: string;
  schema_version: typeof PROPERTY_SCHEMA_VERSION;
  canonical_status: PropertyCanonicalStatus;
  project_id: string | null;
  project_unit_id: string | null;
  facts: CanonicalPropertyFactsV1;
  offers: CanonicalOfferV1[];
  media: MediaAssetV1[];
  intelligence: PropertyIntelligenceV1 | null;
  display_policies: OfferDisplayPolicyV1[];
  created_at: string;
  updated_at: string;
}

export function emptyPropertyFacts(): CanonicalPropertyFactsV1 {
  return {
    classification: {
      property_type: fact("unknown"),
      market_segment: fact("unknown"),
    },
    location: {
      country: fact("Morocco"),
      city: fact(null),
      geo_precision: fact("unknown"),
      geo_source: fact("unknown"),
    },
    surfaces: {},
    layout: {},
    building: {},
    features: {},
    condition: {},
    land: {},
    legal: {},
  };
}
