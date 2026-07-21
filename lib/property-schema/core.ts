export const PROPERTY_SCHEMA_VERSION = "1.0" as const;

export type ProvenanceKind = "DECLARED" | "VERIFIED_DOCUMENT" | "DERIVED_GEO" | "DERIVED_MARKET" | "INFERRED";
export type FactConfidence = "high" | "medium" | "low" | "unknown";
export type FactVerificationStatus = "unverified" | "consistent" | "verified" | "disputed";
export type FactVisibility = "PUBLIC" | "PARTNER_ONLY" | "INTERNAL" | "SUPPRESSED";
export type AcquisitionChannel = "partner_api" | "partner_feed" | "manual_partner" | "first_party_user" | "source_page" | "search_result" | "document" | "system";

export type CanonicalFact<T> = {
  value: T | null;
  provenance: ProvenanceKind;
  confidence: FactConfidence;
  observed_at: string | null;
  source_ref: string | null;
  verification_status: FactVerificationStatus;
  visibility: FactVisibility;
};

export function fact<T>(value: T | null, options: Partial<Omit<CanonicalFact<T>, "value">> = {}): CanonicalFact<T> {
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

export type CanonicalPropertyType = "apartment" | "villa" | "house" | "studio" | "duplex" | "riad" | "land" | "office" | "commercial" | "warehouse" | "industrial" | "farm" | "building" | "other" | "unknown";
export type CanonicalTransactionType = "sale" | "rent";
export type MarketSegment = "resale" | "new_build" | "off_plan" | "unknown";
export type PropertyCanonicalStatus = "active" | "inactive" | "merged" | "disputed" | "unknown";
export type GeoPrecision = "exact" | "neighborhood_centroid" | "city_centroid" | "unknown";
export type GeoSource = "declared" | "scraped_coordinates" | "neighborhood_centroid" | "city_centroid" | "manual" | "unknown";

type FactGroup<T> = { [K in keyof T]?: CanonicalFact<T[K]> };

type SurfaceFields = {
  surface_total_m2: number; surface_habitable_m2: number; surface_built_m2: number; surface_land_m2: number;
  terrace_m2: number; balcony_m2: number; garden_m2: number; roof_terrace_m2: number; frontage_m: number; land_depth_m: number;
  ceiling_height_m: number; usable_area_m2: number; common_area_m2: number; surface_notes: string;
};
type LayoutFields = {
  rooms_count: number; bedrooms_count: number; bathrooms_count: number; shower_rooms_count: number; toilets_count: number;
  living_rooms_count: number; moroccan_living_rooms_count: number; european_living_rooms_count: number; kitchens_count: number;
  kitchen_type: string; balconies_count: number; terraces_count: number; storage_rooms_count: number; maid_rooms_count: number;
};
type BuildingFields = {
  construction_year: number; property_age_range: string; floor_number: number; floors_count: number; units_in_building: number;
  orientation: string; exposure: string; view_type: string; architecture_style: string; floor_type: string; ceiling_type: string;
  facade_condition: string; common_areas_condition: string; elevator_count: number;
};
type FeatureFields = {
  has_elevator: boolean; has_parking: boolean; parking_spaces: number; parking_type: string; has_garage: boolean; garage_spaces: number;
  has_pool: boolean; pool_type: string; has_garden: boolean; has_terrace: boolean; has_balcony: boolean; has_concierge: boolean;
  has_security: boolean; has_gated_access: boolean; has_equipped_kitchen: boolean; has_air_conditioning: boolean; has_heating: boolean;
  has_fireplace: boolean; has_solar_panels: boolean; has_water_tank: boolean; has_well: boolean; has_storage: boolean; has_cellar: boolean;
  is_furnished: boolean; furnishing_level: string; premium_features: string[];
};
type ConditionFields = {
  condition: string; renovation_status: string; renovation_year: number; finish_level: string; quality_tier: string;
  structural_condition: string; interior_condition: string; exterior_condition: string; availability_condition: string; condition_notes: string;
};
type LandFields = {
  zoning_type: string; constructible_status: string; allowed_land_use: string; facade_count: number; road_access_width_m: number;
  land_shape: string; land_slope: string; utilities_water: boolean; utilities_electricity: boolean; utilities_sewer: boolean; subdivision_status: string;
};
type LegalFields = {
  title_status: string; title_deed_available: boolean; ownership_type: string; cadastral_reference_available: boolean; building_permit_status: string;
  occupancy_permit_status: string; coownership_status: string; coownership_rules_available: boolean; mortgage_status_declared: string;
  encumbrance_status_declared: string; legal_documents_available: boolean; documents_verified_count: number; legal_verification_status: string; legal_notes: string;
};

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
  surfaces: FactGroup<SurfaceFields>;
  layout: FactGroup<LayoutFields>;
  building: FactGroup<BuildingFields>;
  features: FactGroup<FeatureFields>;
  condition: FactGroup<ConditionFields>;
  land: FactGroup<LandFields>;
  legal: FactGroup<LegalFields>;
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
  price_range_min?: CanonicalFact<number>;
  price_range_max?: CanonicalFact<number>;
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
  media_id: string; property_id: string; offer_id: string | null; type: "image" | "video" | "floor_plan" | "document";
  url: string; source_url: string | null; rights_status: "allowed" | "source_link_only" | "unknown" | "forbidden";
  publication_permission: "allowed" | "partner_only" | "forbidden" | "unknown"; cache_permission: boolean; download_permission: boolean;
  attribution: string | null; observed_at: string | null; last_checked_at: string | null;
}

export interface PropertyIntelligenceV1 {
  property_id: string; computed_at: string; price_per_m2: number | null; price_per_m2_method: "price_divided_by_surface" | "unavailable";
  market_position: "below_market" | "near_market" | "above_market" | "overpriced" | "insufficient_data" | null;
  market_reference_id: string | null; data_completeness_score: number | null; freshness_score: number | null; duplicate_score: number | null;
  anomaly_score: number | null; akar_score: number | null; listing_conclusion: string | null; property_fit_score: number | null;
  investment_score: number | null; mre_score: number | null;
}

export interface OfferDisplayPolicyV1 {
  offer_id: string; can_show_result: boolean; can_show_thumbnail: boolean; can_show_gallery: boolean; can_show_contact: boolean; can_show_snippet: boolean;
  primary_cta: "view_original" | "view_source" | "view_full_listing" | "none"; allowed_ctas: string[]; source_badge: string | null;
  display_depth: "full" | "rich" | "limited_preview" | "market_signal_only" | "hidden"; production_allowed: boolean; block_reason: string | null;
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
    classification: { property_type: fact("unknown"), market_segment: fact("unknown") },
    location: {
      country: fact("Morocco"),
      city: fact<string>(null),
      geo_precision: fact("unknown"),
      geo_source: fact("unknown"),
    },
    surfaces: {}, layout: {}, building: {}, features: {}, condition: {}, land: {}, legal: {},
  };
}
