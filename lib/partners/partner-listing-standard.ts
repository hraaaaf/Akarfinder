import type {
  PartnerContactMode,
  PartnerFloorPlanDisplayMode,
  PartnerFloorPlanScope,
  PartnerFloorPlanSource,
  PartnerFloorPlanType,
  PartnerListingPublicLabel,
  PartnerLocationLevel,
  PartnerMediaUsageScope,
  PartnerTier,
} from "./partner-listing-types";

export const PARTNER_LOCATION_LEVELS: readonly PartnerLocationLevel[] = [
  "district_only",
  "approximate_zone",
  "exact_address_authorized",
] as const;

export const PARTNER_TIERS: readonly PartnerTier[] = [
  "promoter_partner",
  "agency_premium",
  "agency_partner",
] as const;

export const PARTNER_MEDIA_USAGE_SCOPES: readonly PartnerMediaUsageScope[] = [
  "akarfinder_partner_page",
  "partner_campaign",
  "none",
] as const;

export const PARTNER_CONTACT_MODES: readonly PartnerContactMode[] = [
  "form",
  "partner_page",
  "phone",
  "hidden",
] as const;

export const PARTNER_FLOOR_PLAN_TYPES: readonly PartnerFloorPlanType[] = [
  "unit_floor_plan",
  "floor_plate",
  "project_master_plan",
  "site_plan",
  "lot_plan",
  "none",
] as const;

export const PARTNER_FLOOR_PLAN_DISPLAY_MODES: readonly PartnerFloorPlanDisplayMode[] = [
  "hidden",
  "available_on_request",
  "visible_on_partner_page",
  "visible_in_demo",
] as const;

export const PARTNER_FLOOR_PLAN_SOURCES: readonly PartnerFloorPlanSource[] = [
  "partner_provided",
  "architect_provided_by_partner",
  "sales_brochure",
  "demo_placeholder",
] as const;

export const PARTNER_FLOOR_PLAN_SCOPES: readonly PartnerFloorPlanScope[] = [
  "unit",
  "building",
  "project",
  "parcel",
  "unknown",
] as const;

export const AUTHORIZED_PARTNER_PUBLIC_LABELS = [
  "Promoteur partenaire",
  "Agence premium",
  "Agence partenaire",
  "Resultat web externe",
  "Source originale",
  "Apercu limite",
  "Fiche enrichie",
  "Informations limitees",
  "Page partenaire autorisee",
  "Plan 2D fourni par le partenaire",
  "Plan indicatif",
  "Plan disponible sur demande",
  "Plan de vente partenaire",
  "A confirmer aupres du partenaire",
] as const;

export const PARTNER_LISTING_QUALITY_PUBLIC_LABELS: readonly PartnerListingPublicLabel[] = [
  "Informations limitees",
  "Fiche structuree",
  "Fiche enrichie",
  "Presentation premium",
] as const;

export const FORBIDDEN_PARTNER_WORDING = [
  "verifie",
  "certifie",
  "officiel",
  "fiable",
  "meilleur",
  "garanti",
  "prix reel",
  "plan certifie",
  "plan officiel",
  "plan verifie",
  "plan garanti",
  "surface garantie",
  "conformite garantie",
  "annonce verifiee",
  "annonce fiable",
  "agence de confiance",
  "partenaire officiel",
] as const;

export const PARTNER_LISTING_REQUIRED_FIELDS = [
  "partner_id",
  "partner_type",
  "partner_tier",
  "authorization_status",
  "source_authorization_note",
  "transaction_type",
  "property_type",
  "city",
  "district",
  "location_level",
  "approximate_area_label",
  "address_public_allowed",
  "currency",
  "price_display_mode",
  "surface_m2",
  "availability_status",
  "photos_authorized",
  "photo_count",
  "media_usage_scope",
  "contact_authorized",
  "contact_mode",
  "title",
  "short_description",
  "normalized_description",
  "highlights",
  "points_to_verify",
  "proximity_allowed",
  "neighborhood_context_allowed",
  "mobility_context_allowed",
  "floor_plan_authorized",
  "floor_plan_available",
  "floor_plan_type",
  "floor_plan_display_mode",
  "floor_plan_source",
  "floor_plan_scope",
  "floor_plan_has_dimensions",
  "floor_plan_has_room_labels",
  "floor_plan_has_orientation",
  "floor_plan_has_surface_breakdown",
] as const;
