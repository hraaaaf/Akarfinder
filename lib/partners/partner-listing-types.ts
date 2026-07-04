export type PartnerType = "promoter" | "agency";

export type PartnerTier = "promoter_partner" | "agency_premium" | "agency_partner";

export type PartnerAuthorizationStatus = "partner_authorized";

export type PartnerTransactionType = "sale" | "rent" | "new" | "sell_request";

export type PartnerPropertyType =
  | "apartment"
  | "villa"
  | "house"
  | "land"
  | "office"
  | "retail"
  | "project";

export type PartnerLocationLevel =
  | "district_only"
  | "approximate_zone"
  | "exact_address_authorized";

export type PartnerCurrency = "MAD";

export type PartnerPriceDisplayMode = "exact" | "range" | "on_request";

export type PartnerAvailabilityStatus =
  | "available"
  | "upcoming"
  | "reserved"
  | "sold"
  | "rented"
  | "unknown";

export type PartnerMediaUsageScope =
  | "akarfinder_partner_page"
  | "partner_campaign"
  | "none";

export type PartnerContactMode = "form" | "partner_page" | "phone" | "hidden";

export type PartnerListingQualityLevel =
  | "limited"
  | "standard"
  | "enriched"
  | "premium_ready";

export type PartnerListingPublicLabel =
  | "Informations limitees"
  | "Fiche structuree"
  | "Fiche enrichie"
  | "Presentation premium";

export interface PartnerListingStandard {
  partner_id: string;
  partner_type: PartnerType;
  partner_tier: PartnerTier;
  authorization_status: PartnerAuthorizationStatus;
  source_authorization_note: string;
  transaction_type: PartnerTransactionType;
  property_type: PartnerPropertyType;
  city: string;
  district: string;
  location_level: PartnerLocationLevel;
  approximate_area_label: string;
  latitude?: number;
  longitude?: number;
  address_public_allowed: boolean;
  price_amount?: number;
  price_range_min?: number;
  price_range_max?: number;
  currency: PartnerCurrency;
  price_display_mode: PartnerPriceDisplayMode;
  surface_m2: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  orientation?: string;
  elevator?: boolean;
  parking?: boolean;
  terrace?: boolean;
  furnished?: boolean;
  condition?: string;
  availability_status: PartnerAvailabilityStatus;
  last_partner_update_at?: string;
  photos_authorized: boolean;
  photo_count: number;
  media_usage_scope: PartnerMediaUsageScope;
  contact_authorized: boolean;
  contact_mode: PartnerContactMode;
  title: string;
  short_description: string;
  normalized_description: string;
  highlights: string[];
  points_to_verify: string[];
  proximity_allowed: boolean;
  neighborhood_context_allowed: boolean;
  mobility_context_allowed: boolean;
}
