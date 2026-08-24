import { adaptPartnerListing } from "../property-schema/adapters";
import {
  fact,
  type AcquisitionChannel,
  type CanonicalPropertyV1,
  type MediaAssetV1,
  type OfferAvailabilityStatus,
  type OfferOriginType,
} from "../property-schema/core";
import type {
  PartnerAvailabilityStatus,
  PartnerListingStandard,
} from "./partner-listing-types";

export const PARTNER_LISTING_V2_VERSION = "2.0" as const;

export type PartnerListingV2Channel = Extract<
  AcquisitionChannel,
  "partner_api" | "partner_feed" | "manual_partner"
>;

export type PartnerListingV2Availability = PartnerAvailabilityStatus | "withdrawn";

export type PartnerMediaInputV2 = {
  type: MediaAssetV1["type"];
  url: string;
  source_url?: string | null;
  rights_status: MediaAssetV1["rights_status"];
  publication_permission: MediaAssetV1["publication_permission"];
  cache_permission?: boolean;
  download_permission?: boolean;
  attribution?: string | null;
};

export interface PartnerListingV2
  extends Omit<PartnerListingStandard, "availability_status" | "last_partner_update_at"> {
  schema_version: typeof PARTNER_LISTING_V2_VERSION;
  partner_listing_id: string;
  acquisition_channel: PartnerListingV2Channel;
  availability_status: PartnerListingV2Availability;
  source_url?: string | null;
  published_at_source?: string | null;
  last_partner_update_at: string;

  residence_name?: string | null;
  street_name?: string | null;
  address_private?: string | null;
  address_display?: string | null;
  location_landmark?: string | null;

  rooms_count?: number | null;
  surface_habitable_m2?: number | null;
  surface_built_m2?: number | null;
  surface_land_m2?: number | null;
  construction_year?: number | null;
  view_type?: string | null;
  has_garage?: boolean | null;
  has_pool?: boolean | null;
  has_garden?: boolean | null;
  has_balcony?: boolean | null;
  has_air_conditioning?: boolean | null;
  has_heating?: boolean | null;
  has_security?: boolean | null;
  has_concierge?: boolean | null;
  has_gated_access?: boolean | null;
  has_equipped_kitchen?: boolean | null;

  media?: PartnerMediaInputV2[];
}

export type PartnerListingV2IssueCode =
  | "missing_partner_id"
  | "missing_partner_listing_id"
  | "missing_city"
  | "missing_district"
  | "invalid_surface"
  | "invalid_exact_price"
  | "invalid_price_range"
  | "invalid_coordinates"
  | "invalid_update_timestamp"
  | "private_address_exposed"
  | "unauthorized_media"
  | "invalid_media_url"
  | "photo_count_mismatch";

export type PartnerListingV2Issue = {
  code: PartnerListingV2IssueCode;
  field: string;
  message: string;
};

export type PartnerListingV2Validation = {
  valid: boolean;
  issues: PartnerListingV2Issue[];
};

export type PartnerListingV2Identity = {
  stable_key: string;
  property_id: string;
  offer_id: string;
  external_offer_id: string;
};

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function safeIdPart(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase());
}

function isIsoDate(value: string): boolean {
  return nonEmpty(value) && Number.isFinite(Date.parse(value));
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildPartnerListingV2Identity(
  listing: Pick<PartnerListingV2, "partner_id" | "partner_listing_id">,
): PartnerListingV2Identity {
  const partner = safeIdPart(listing.partner_id);
  const external = safeIdPart(listing.partner_listing_id);
  const stableKey = `${partner}:${external}`;
  return {
    stable_key: stableKey,
    property_id: `partner-property:${stableKey}`,
    offer_id: `partner-offer:${stableKey}`,
    external_offer_id: listing.partner_listing_id.trim(),
  };
}

export function validatePartnerListingV2(listing: PartnerListingV2): PartnerListingV2Validation {
  const issues: PartnerListingV2Issue[] = [];
  const add = (code: PartnerListingV2IssueCode, field: string, message: string) => {
    issues.push({ code, field, message });
  };

  if (!nonEmpty(listing.partner_id)) add("missing_partner_id", "partner_id", "partner_id est obligatoire");
  if (!nonEmpty(listing.partner_listing_id)) add("missing_partner_listing_id", "partner_listing_id", "partner_listing_id stable est obligatoire");
  if (!nonEmpty(listing.city)) add("missing_city", "city", "city est obligatoire");
  if (!nonEmpty(listing.district)) add("missing_district", "district", "district/quartier est obligatoire en V2 partenaire");
  if (!Number.isFinite(listing.surface_m2) || listing.surface_m2 <= 0) {
    add("invalid_surface", "surface_m2", "surface_m2 doit être strictement positive");
  }

  if (listing.price_display_mode === "exact") {
    if (listing.price_amount == null || !Number.isFinite(listing.price_amount) || listing.price_amount <= 0) {
      add("invalid_exact_price", "price_amount", "un prix exact doit être strictement positif");
    }
  }
  if (listing.price_display_mode === "range") {
    const min = listing.price_range_min;
    const max = listing.price_range_max;
    if (min == null || max == null || !Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > max) {
      add("invalid_price_range", "price_range_min", "la fourchette doit être positive et min <= max");
    }
  }

  const hasLat = listing.latitude != null;
  const hasLng = listing.longitude != null;
  if (
    hasLat !== hasLng ||
    (hasLat && (!Number.isFinite(listing.latitude) || listing.latitude! < -90 || listing.latitude! > 90)) ||
    (hasLng && (!Number.isFinite(listing.longitude) || listing.longitude! < -180 || listing.longitude! > 180))
  ) {
    add("invalid_coordinates", "latitude", "latitude/longitude doivent être présentes ensemble et dans les bornes WGS84");
  }

  if (!isIsoDate(listing.last_partner_update_at)) {
    add("invalid_update_timestamp", "last_partner_update_at", "last_partner_update_at doit être une date ISO exploitable");
  }

  if (nonEmpty(listing.address_display) && !listing.address_public_allowed) {
    add("private_address_exposed", "address_display", "une adresse publique exige address_public_allowed=true");
  }

  const media = listing.media ?? [];
  const imageCount = media.filter((item) => item.type === "image").length;
  for (const item of media) {
    if (!isHttpUrl(item.url)) add("invalid_media_url", "media.url", "chaque média doit avoir une URL http(s) valide");
    if (item.publication_permission === "allowed" && item.rights_status !== "allowed") {
      add("unauthorized_media", "media.publication_permission", "un média public doit avoir rights_status=allowed");
    }
    if (item.type === "image" && item.publication_permission === "allowed") {
      if (!listing.photos_authorized || listing.media_usage_scope === "none") {
        add("unauthorized_media", "photos_authorized", "une image publique exige photos_authorized et un media_usage_scope autorisé");
      }
    }
    if (item.type === "floor_plan" && item.publication_permission === "allowed") {
      if (!listing.floor_plan_authorized || !listing.floor_plan_available || listing.floor_plan_display_mode === "hidden") {
        add("unauthorized_media", "floor_plan_authorized", "un plan public exige autorisation, disponibilité et display_mode non hidden");
      }
    }
  }
  if (imageCount > listing.photo_count) {
    add("photo_count_mismatch", "photo_count", "photo_count ne peut pas être inférieur au nombre d'images fournies");
  }

  return { valid: issues.length === 0, issues };
}

function compatibleAvailability(value: PartnerListingV2Availability): PartnerAvailabilityStatus {
  return value === "withdrawn" ? "unknown" : value;
}

function originForChannel(channel: PartnerListingV2Channel): OfferOriginType {
  return channel === "partner_api" ? "partner_api" : "partner_feed";
}

function setDeclared<T>(
  value: T | null | undefined,
  sourceRef: string,
  observedAt: string,
  visibility: "PUBLIC" | "PARTNER_ONLY" | "INTERNAL" = "PUBLIC",
) {
  return fact(value ?? null, {
    provenance: "DECLARED",
    confidence: value == null ? "unknown" : "high",
    observed_at: observedAt,
    source_ref: sourceRef,
    verification_status: "unverified",
    visibility,
  });
}

export function adaptPartnerListingV2(listing: PartnerListingV2, now = new Date().toISOString()): CanonicalPropertyV1 {
  const validation = validatePartnerListingV2(listing);
  if (!validation.valid) {
    const codes = validation.issues.map((issue) => issue.code).join(", ");
    throw new Error(`Invalid PartnerListingV2: ${codes}`);
  }

  const identity = buildPartnerListingV2Identity(listing);
  const standard: PartnerListingStandard = {
    ...listing,
    availability_status: compatibleAvailability(listing.availability_status),
  };

  const property = adaptPartnerListing(standard, {
    property_id: identity.property_id,
    offer_id: identity.offer_id,
    source_id: listing.partner_id,
    source_name: listing.partner_id,
    external_offer_id: identity.external_offer_id,
    source_url: listing.source_url ?? null,
    now,
    acquisition_channel: listing.acquisition_channel,
    origin_type: originForChannel(listing.acquisition_channel),
    compliance_status: "allowed",
  });

  const sourceRef = listing.partner_id;
  const observedAt = listing.last_partner_update_at;
  const facts = property.facts;

  if (nonEmpty(listing.residence_name)) facts.location.residence_name = setDeclared(listing.residence_name, sourceRef, observedAt);
  if (nonEmpty(listing.street_name)) facts.location.street_name = setDeclared(listing.street_name, sourceRef, observedAt, "PARTNER_ONLY");
  if (nonEmpty(listing.address_private)) facts.location.address_private = setDeclared(listing.address_private, sourceRef, observedAt, "INTERNAL");
  if (nonEmpty(listing.address_display) && listing.address_public_allowed) facts.location.address_display = setDeclared(listing.address_display, sourceRef, observedAt);
  if (nonEmpty(listing.location_landmark)) facts.location.location_landmark = setDeclared(listing.location_landmark, sourceRef, observedAt);

  if (listing.rooms_count != null) facts.layout.rooms_count = setDeclared(listing.rooms_count, sourceRef, observedAt);
  if (listing.surface_habitable_m2 != null) facts.surfaces.surface_habitable_m2 = setDeclared(listing.surface_habitable_m2, sourceRef, observedAt);
  if (listing.surface_built_m2 != null) facts.surfaces.surface_built_m2 = setDeclared(listing.surface_built_m2, sourceRef, observedAt);
  if (listing.surface_land_m2 != null) facts.surfaces.surface_land_m2 = setDeclared(listing.surface_land_m2, sourceRef, observedAt);
  if (listing.construction_year != null) facts.building.construction_year = setDeclared(listing.construction_year, sourceRef, observedAt);
  if (nonEmpty(listing.view_type)) facts.building.view_type = setDeclared(listing.view_type, sourceRef, observedAt);
  if (listing.has_garage != null) facts.features.has_garage = setDeclared(listing.has_garage, sourceRef, observedAt);
  if (listing.has_pool != null) facts.features.has_pool = setDeclared(listing.has_pool, sourceRef, observedAt);
  if (listing.has_garden != null) facts.features.has_garden = setDeclared(listing.has_garden, sourceRef, observedAt);
  if (listing.has_balcony != null) facts.features.has_balcony = setDeclared(listing.has_balcony, sourceRef, observedAt);
  if (listing.has_air_conditioning != null) facts.features.has_air_conditioning = setDeclared(listing.has_air_conditioning, sourceRef, observedAt);
  if (listing.has_heating != null) facts.features.has_heating = setDeclared(listing.has_heating, sourceRef, observedAt);
  if (listing.has_security != null) facts.features.has_security = setDeclared(listing.has_security, sourceRef, observedAt);
  if (listing.has_concierge != null) facts.features.has_concierge = setDeclared(listing.has_concierge, sourceRef, observedAt);
  if (listing.has_gated_access != null) facts.features.has_gated_access = setDeclared(listing.has_gated_access, sourceRef, observedAt);
  if (listing.has_equipped_kitchen != null) facts.features.has_equipped_kitchen = setDeclared(listing.has_equipped_kitchen, sourceRef, observedAt);

  const offer = property.offers[0];
  offer.external_offer_id = identity.external_offer_id;
  offer.source_url = listing.source_url ?? null;
  offer.canonical_source_url = listing.source_url ?? null;
  offer.acquisition_channel = listing.acquisition_channel;
  offer.origin_type = originForChannel(listing.acquisition_channel);
  offer.availability_status = listing.availability_status as OfferAvailabilityStatus;
  offer.published_at_source = listing.published_at_source ?? null;
  offer.first_observed_at = listing.published_at_source ?? observedAt;
  offer.last_observed_at = now;
  offer.updated_at_source = observedAt;
  offer.offer_status = ["sold", "rented", "withdrawn"].includes(listing.availability_status) ? "inactive" : "active";

  property.media = (listing.media ?? []).map((item, index): MediaAssetV1 => ({
    media_id: `${identity.offer_id}:media:${index + 1}`,
    property_id: identity.property_id,
    offer_id: identity.offer_id,
    type: item.type,
    url: item.url,
    source_url: item.source_url ?? listing.source_url ?? null,
    rights_status: item.rights_status,
    publication_permission: item.publication_permission,
    cache_permission: item.cache_permission ?? false,
    download_permission: item.download_permission ?? false,
    attribution: item.attribution ?? listing.partner_id,
    observed_at: observedAt,
    last_checked_at: null,
  }));
  property.updated_at = now;

  return property;
}
