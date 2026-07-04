import type {
  PartnerContactMode,
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
] as const;
