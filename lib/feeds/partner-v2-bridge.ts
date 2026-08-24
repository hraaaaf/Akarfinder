import type { ValidatedFeedRow } from "./schema";
import {
  PARTNER_LISTING_V2_VERSION,
  type PartnerListingV2,
  type PartnerListingV2Channel,
} from "../partners/partner-listing-v2";
import type { PartnerTier, PartnerType } from "../partners/partner-listing-types";

export type PartnerFeedV2Context = {
  partner_id: string;
  partner_type: PartnerType;
  partner_tier: PartnerTier;
  source_authorization_note: string;
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

function safeUpdateTime(value: string | null, fallback: string): string {
  return value && Number.isFinite(Date.parse(value)) ? value : fallback;
}

export function validatedFeedRowToPartnerListingV2(
  row: ValidatedFeedRow,
  context: PartnerFeedV2Context,
  now = new Date().toISOString(),
): PartnerFeedV2BridgeResult {
  if (!row.external_id?.trim()) {
    return { ok: false, reason: "PartnerListingV2 exige external_id/partner_listing_id stable" };
  }

  const updatedAt = safeUpdateTime(row.updated_at_source, now);
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
  const images = row.image_urls;
  const hasImages = images.length > 0;

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
    availability_status: "available",
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
