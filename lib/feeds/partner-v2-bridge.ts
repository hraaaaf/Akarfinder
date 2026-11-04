import type { ValidatedFeedRow } from "./schema";
import {
  PARTNER_LISTING_V2_VERSION,
  type PartnerListingV2,
  type PartnerListingV2Channel,
  type PartnerListingV2Availability,
} from "../partners/partner-listing-v2";
import type { PartnerTier, PartnerType } from "../partners/partner-listing-types";

export type PartnerFeedV2Context = {
  partner_id: string;
  partner_type: PartnerType;
  partner_tier: PartnerTier;
  source_authorization_note: string;
  // This is only an assertion from a trusted upstream verifier. The bridge
  // cannot independently inspect or certify the underlying license.
  authorization_evidence?: { verified: boolean; reference: string };
  activity_evidence?: {
    status: PartnerListingV2Availability;
    verified: boolean;
    checked_at: string;
    reference: string;
  };
  media_rights_evidence?: { verified: boolean; reference: string };
  acquisition_channel?: PartnerListingV2Channel;
  contact_authorized?: boolean;
  proximity_allowed?: boolean;
  neighborhood_context_allowed?: boolean;
  mobility_context_allowed?: boolean;
};

export type PartnerListingV2LifecycleEvent = {
  partner_id: string;
  partner_listing_id: string;
  availability_status: "withdrawn";
  source_url: string | null;
  updated_at_source: string;
  reason: "delete" | "unpublish";
};

export type PartnerFeedV2BridgeResult =
  | { ok: true; kind: "listing"; listing: PartnerListingV2 }
  | { ok: true; kind: "lifecycle"; event: PartnerListingV2LifecycleEvent }
  | { ok: false; reason: string };

function toPartnerPropertyType(value: ValidatedFeedRow["property_type"]): PartnerListingV2["property_type"] | null {
  switch (value) {
    case "apartment": return "apartment";
    case "villa": return "villa";
    case "land": return "land";
    case "office": return "office";
    case "commercial": return "retail";
    default: return null;
  }
}

function validIsoTime(value: string | null | undefined): value is string {
  return typeof value === "string"
    && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function verifiedReference(evidence: { verified: boolean; reference: string } | undefined): boolean {
  return evidence?.verified === true && typeof evidence.reference === "string" && evidence.reference.trim().length > 0;
}

const ACTIVE_EVIDENCE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function validatedFeedRowToPartnerListingV2(
  row: ValidatedFeedRow,
  context: PartnerFeedV2Context,
  now = new Date().toISOString(),
): PartnerFeedV2BridgeResult {
  if (!row.external_id?.trim()) {
    return { ok: false, reason: "PartnerListingV2 exige external_id/partner_listing_id stable" };
  }

  if (!context.partner_id?.trim() || row.source_name.trim() !== context.partner_id.trim()) {
    return { ok: false, reason: "partner_id/source_name mismatch ou absent" };
  }
  if (!validIsoTime(now) || !validIsoTime(row.updated_at_source)) {
    return { ok: false, reason: "updated_at_source ISO explicite obligatoire ; jamais fallback now" };
  }
  const updatedAt = row.updated_at_source;
  if (Date.parse(updatedAt) > Date.parse(now)) {
    return { ok: false, reason: "updated_at_source dans le futur" };
  }
  // Honor authenticated partner withdrawals even if a former authorization
  // has since expired; never create an active record on the same path.
  if (row.update_signal === "delete" || row.update_signal === "unpublish") {
    return {
      ok: true,
      kind: "lifecycle",
      event: {
        partner_id: context.partner_id,
        partner_listing_id: row.external_id.trim(),
        availability_status: "withdrawn",
        source_url: row.source_url,
        updated_at_source: updatedAt,
        reason: row.update_signal,
      },
    };
  }

  if (!context.source_authorization_note?.trim()
      || !verifiedReference(context.authorization_evidence)) {
    return { ok: false, reason: "preuve d'autorisation partenaire verifiee requise avant bridge V2" };
  }
  if (!row.district?.trim()) {
    return { ok: false, reason: "PartnerListingV2 exige un quartier/district explicite" };
  }
  if (row.surface_m2 == null || row.surface_m2 <= 0) {
    return { ok: false, reason: "PartnerListingV2 exige une surface_m2 positive" };
  }

  const propertyType = toPartnerPropertyType(row.property_type);
  if (!propertyType) {
    return { ok: false, reason: `property_type non supporté par PartnerListingV2: ${row.property_type}` };
  }

  const hasCoordinates = row.coordinates != null;
  const images = verifiedReference(context.media_rights_evidence) ? row.image_urls : [];
  const hasImages = images.length > 0;
  // A feed update timestamp is NOT itself evidence of an active listing.
  // Until a trusted upstream source verifies availability, use "unknown".
  const evidence = context.activity_evidence;
  const checkedAtMs = validIsoTime(evidence?.checked_at) ? Date.parse(evidence.checked_at) : NaN;
  const ageMs = Date.parse(now) - checkedAtMs;
  const verifiedAvailable = evidence?.status === "available"
    && verifiedReference(evidence)
    && Number.isFinite(ageMs)
    && ageMs >= 0
    && ageMs <= ACTIVE_EVIDENCE_MAX_AGE_MS;
  const availability: PartnerListingV2Availability = verifiedAvailable ? "available" : "unknown";

  const listing: PartnerListingV2 = {
    schema_version: PARTNER_LISTING_V2_VERSION,
    partner_listing_id: row.external_id.trim(),
    acquisition_channel: context.acquisition_channel ?? "partner_feed",
    partner_id: context.partner_id,
    partner_type: context.partner_type,
    partner_tier: context.partner_tier,
    authorization_status: "partner_authorized",
    source_authorization_note: context.source_authorization_note,
    transaction_type: row.transaction_type,
    property_type: propertyType,
    city: row.city,
    district: row.district,
    location_level: hasCoordinates ? "approximate_zone" : "district_only",
    approximate_area_label: `${row.district}, ${row.city}`,
    ...(row.coordinates ? { latitude: row.coordinates.lat, longitude: row.coordinates.lng } : {}),
    address_public_allowed: false,
    ...(row.price_mad == null
      ? { price_display_mode: "on_request" as const }
      : { price_display_mode: "exact" as const, price_amount: row.price_mad }),
    currency: "MAD",
    surface_m2: row.surface_m2,
    bedrooms: row.bedrooms_count ?? undefined,
    availability_status: availability,
    last_partner_update_at: updatedAt,
    photos_authorized: hasImages,
    photo_count: images.length,
    media_usage_scope: hasImages ? "akarfinder_partner_page" : "none",
    contact_authorized: context.contact_authorized ?? false,
    contact_mode: context.contact_authorized ? "form" : "hidden",
    title: row.title,
    short_description: row.description ?? "",
    normalized_description: row.description ?? "",
    highlights: [],
    points_to_verify: [],
    proximity_allowed: context.proximity_allowed ?? false,
    neighborhood_context_allowed: context.neighborhood_context_allowed ?? false,
    mobility_context_allowed: context.mobility_context_allowed ?? false,
    floor_plan_authorized: false,
    floor_plan_available: false,
    floor_plan_type: "none",
    floor_plan_display_mode: "hidden",
    floor_plan_source: "partner_provided",
    floor_plan_scope: "unknown",
    floor_plan_has_dimensions: false,
    floor_plan_has_room_labels: false,
    floor_plan_has_orientation: false,
    floor_plan_has_surface_breakdown: false,
    source_url: row.source_url,
    media: images.map((url) => ({
      type: "image" as const,
      url,
      source_url: row.source_url,
      rights_status: "allowed" as const,
      publication_permission: "allowed" as const,
      cache_permission: false,
      download_permission: false,
      attribution: context.partner_id,
    })),
  };

  return { ok: true, kind: "listing", listing };
}
