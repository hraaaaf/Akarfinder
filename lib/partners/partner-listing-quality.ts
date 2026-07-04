import type {
  PartnerListingPublicLabel,
  PartnerListingQualityLevel,
  PartnerListingStandard,
} from "./partner-listing-types";

const PUBLIC_LABELS: Record<PartnerListingQualityLevel, PartnerListingPublicLabel> = {
  limited: "Informations limitees",
  standard: "Fiche structuree",
  enriched: "Fiche enrichie",
  premium_ready: "Presentation premium",
};

export const FORBIDDEN_PARTNER_PUBLIC_LABEL_TERMS = [
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

export function getPartnerListingPublicLabel(
  qualityLevel: PartnerListingQualityLevel,
): PartnerListingPublicLabel {
  return PUBLIC_LABELS[qualityLevel];
}

export function getPartnerListingQualityLevel(
  listing: Partial<PartnerListingStandard>,
  now: Date = new Date(),
): PartnerListingQualityLevel {
  if (!hasMinimumStandardFields(listing)) {
    return "limited";
  }

  const hasRichSpecs = hasPositiveNumber(listing.surface_m2)
    && (hasPositiveNumber(listing.bedrooms) || hasPositiveNumber(listing.bathrooms))
    && typeof listing.availability_status === "string";

  const hasAuthorizedMediaAndContact = listing.photos_authorized === true
    && hasPositiveNumber(listing.photo_count)
    && listing.media_usage_scope !== "none"
    && listing.contact_authorized === true
    && listing.contact_mode !== "hidden";

  const hasRecentUpdate = isRecentPartnerUpdate(listing.last_partner_update_at, now);

  if (
    hasRichSpecs
    && hasAuthorizedMediaAndContact
    && hasRecentUpdate
    && listing.proximity_allowed === true
    && listing.neighborhood_context_allowed === true
    && listing.mobility_context_allowed === true
  ) {
    return "premium_ready";
  }

  if (hasRichSpecs && hasAuthorizedMediaAndContact) {
    return "enriched";
  }

  return "standard";
}

export function hasMinimumStandardFields(listing: Partial<PartnerListingStandard>): boolean {
  return Boolean(
    nonEmpty(listing.partner_id)
      && listing.authorization_status === "partner_authorized"
      && nonEmpty(listing.source_authorization_note)
      && nonEmpty(listing.title)
      && nonEmpty(listing.city)
      && nonEmpty(listing.district)
      && nonEmpty(listing.approximate_area_label)
      && typeof listing.location_level === "string"
      && listing.address_public_allowed !== undefined
      && typeof listing.transaction_type === "string"
      && typeof listing.property_type === "string"
      && listing.currency === "MAD"
      && typeof listing.price_display_mode === "string"
      && hasPriceSignal(listing)
      && hasPositiveNumber(listing.surface_m2),
  );
}

function hasPriceSignal(listing: Partial<PartnerListingStandard>): boolean {
  if (listing.price_display_mode === "on_request") {
    return true;
  }

  if (listing.price_display_mode === "exact") {
    return hasPositiveNumber(listing.price_amount);
  }

  return hasPositiveNumber(listing.price_range_min)
    && hasPositiveNumber(listing.price_range_max)
    && Number(listing.price_range_min) <= Number(listing.price_range_max);
}

function isRecentPartnerUpdate(value: string | undefined, now: Date): boolean {
  if (!value) {
    return false;
  }

  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) {
    return false;
  }

  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  return now.getTime() - updatedAt.getTime() <= ninetyDaysMs;
}

function hasPositiveNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
