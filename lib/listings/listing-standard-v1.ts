import type { GeoPrecision, Listing } from "./types";
import {
  getSourceAccessType,
  type SourceAccessType,
} from "../sources/source-access-registry";

export const LISTING_STANDARD_VERSION = "1.0" as const;

export type ListingActorType =
  | "owner"
  | "agency"
  | "promoter"
  | "broker"
  | "akarfinder"
  | "external_source"
  | "benchmark"
  | "unknown";

export type ListingDisplayDepthV1 =
  | "full_internal"
  | "limited_preview"
  | "market_signal_only"
  | "hidden";

export type ListingMapScopeV1 = "exact" | "district" | "city" | "none";

export type ListingSourceContractV1 = {
  source_key: string;
  source_name: string;
  source_access_type: SourceAccessType;
  actor_type: ListingActorType;
  display_depth: ListingDisplayDepthV1;
  internal_detail_allowed: boolean;
  search_result_allowed: boolean;
  contact_allowed: boolean;
  gallery_allowed: boolean;
  original_source_required: boolean;
};

export type ListingGeoContractV1 = {
  precision: GeoPrecision;
  precision_explicit: boolean;
  has_coordinates: boolean;
  pin_eligible: boolean;
  map_scope: ListingMapScopeV1;
  city: string | null;
  district: string | null;
};

export type ListingQualityContractV1 = {
  completeness_score: number | null;
  completeness_label: string;
  confidence_score: number | null;
  confidence_label: string;
  measured_separately: true;
};

export type ListingStandardV1 = {
  version: typeof LISTING_STANDARD_VERSION;
  listing_id: string;
  source: ListingSourceContractV1;
  geo: ListingGeoContractV1;
  quality: ListingQualityContractV1;
};

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function boundedScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasValidCoordinates(listing: Listing): boolean {
  return (
    typeof listing.latitude === "number" &&
    Number.isFinite(listing.latitude) &&
    listing.latitude >= -90 &&
    listing.latitude <= 90 &&
    typeof listing.longitude === "number" &&
    Number.isFinite(listing.longitude) &&
    listing.longitude >= -180 &&
    listing.longitude <= 180
  );
}

export function resolveListingActorType(listing: Listing): ListingActorType {
  const origin = normalized(listing.result_origin);
  const badge = normalized(listing.source_badge);
  const sourceName = normalized(listing.source_name);

  if (
    origin === "owner_declared" ||
    badge === "owner_published" ||
    sourceName === "propriétaire" ||
    sourceName === "proprietaire"
  ) {
    return "owner";
  }

  if (listing.partner_type === "promoter" || listing.organization_type === "promoter" || listing.source_type === "Promoteur") {
    return "promoter";
  }
  if (listing.partner_type === "agency" || listing.organization_type === "agency" || listing.source_type === "Agence") {
    return "agency";
  }

  const sourceAccessType = getSourceAccessType(listing.source_name ?? "");
  if (sourceAccessType === "first_party") return "akarfinder";
  if (sourceAccessType === "benchmark_source") return "benchmark";
  if (sourceAccessType === "public_external_live" || sourceAccessType === "third_party_legacy") {
    return "external_source";
  }
  return "unknown";
}

/**
 * Policy lookups use stable identifiers when available. Human labels are not
 * authorization keys. Owner listings are mapped to their stable first-party id
 * through explicit owner signals, never by generic fallback promotion.
 */
export function resolveListingSourceKey(listing: Listing, explicitSourceId?: string | null): string {
  const explicit = normalized(explicitSourceId);
  if (explicit) return explicit;
  if (resolveListingActorType(listing) === "owner") return "owner_declared";
  return normalized(listing.source_name);
}

function resolveDisplayDepth(
  listing: Listing,
  accessType: SourceAccessType,
): ListingDisplayDepthV1 {
  if (accessType === "first_party" || accessType === "partner_authorized") {
    return "full_internal";
  }
  if (accessType === "benchmark_source") return "market_signal_only";
  if (accessType === "public_external_live") return "limited_preview";

  // Legacy third-party rows remain fail-closed by default. A limited preview is
  // described only when the existing Search display policy already permits it.
  if (listing.can_show_result === true && listing.production_allowed === true) {
    return "limited_preview";
  }
  return "hidden";
}

export function buildListingSourceContractV1(
  listing: Listing,
  options: { source_id?: string | null } = {},
): ListingSourceContractV1 {
  const actorType = resolveListingActorType(listing);
  const sourceKey = resolveListingSourceKey(listing, options.source_id);
  const accessType = getSourceAccessType(sourceKey);
  const displayDepth = resolveDisplayDepth(listing, accessType);
  const internalDetailAllowed = accessType === "first_party" || accessType === "partner_authorized";
  const searchResultAllowed =
    displayDepth !== "hidden" &&
    displayDepth !== "market_signal_only" &&
    listing.can_show_result !== false &&
    listing.production_allowed !== false;

  return {
    source_key: sourceKey,
    source_name: listing.source_name ?? "",
    source_access_type: accessType,
    actor_type: actorType,
    display_depth: displayDepth,
    internal_detail_allowed: internalDetailAllowed,
    search_result_allowed: searchResultAllowed,
    contact_allowed: internalDetailAllowed && listing.can_show_contact === true,
    gallery_allowed: internalDetailAllowed && listing.can_show_gallery === true,
    original_source_required:
      listing.original_source_required === true ||
      accessType === "public_external_live" ||
      accessType === "third_party_legacy",
  };
}

export function buildListingGeoContractV1(listing: Listing): ListingGeoContractV1 {
  const district = (listing.district ?? listing.neighborhood ?? "").trim() || null;
  const city = (listing.city ?? "").trim() || null;
  const precisionExplicit = listing.geo_precision != null;
  const precision: GeoPrecision = listing.geo_precision ?? (
    district ? "neighborhood_centroid" : city ? "city_centroid" : "unknown"
  );
  const coordinates = hasValidCoordinates(listing);

  const mapScope: ListingMapScopeV1 = precision === "exact"
    ? "exact"
    : precision === "neighborhood_centroid"
      ? "district"
      : precision === "city_centroid"
        ? "city"
        : "none";

  return {
    precision,
    precision_explicit: precisionExplicit,
    has_coordinates: coordinates,
    // An exact semantic label without usable coordinates is not enough to draw
    // an individual pin. This avoids false cartographic precision.
    pin_eligible: precision === "exact" && coordinates,
    map_scope: mapScope,
    city,
    district,
  };
}

function completenessLabel(score: number | null): string {
  if (score == null) return "Complétude non calculée";
  if (score >= 85) return "Informations très détaillées";
  if (score >= 65) return "Informations détaillées";
  if (score >= 35) return "Informations partielles";
  return "Informations limitées";
}

export function buildListingQualityContractV1(listing: Listing): ListingQualityContractV1 {
  const completenessScore = boundedScore(listing.data_completeness_score);
  const confidenceScore = listing.reliability_available === false
    ? null
    : boundedScore(listing.reliability_score);

  return {
    completeness_score: completenessScore,
    completeness_label: completenessLabel(completenessScore),
    confidence_score: confidenceScore,
    confidence_label:
      confidenceScore == null
        ? "Confiance non calculée"
        : listing.reliability_badge ?? listing.reliability_label ?? `Confiance ${confidenceScore}/100`,
    measured_separately: true,
  };
}

export function buildListingStandardV1(
  listing: Listing,
  options: { source_id?: string | null } = {},
): ListingStandardV1 {
  return {
    version: LISTING_STANDARD_VERSION,
    listing_id: listing.id,
    source: buildListingSourceContractV1(listing, options),
    geo: buildListingGeoContractV1(listing),
    quality: buildListingQualityContractV1(listing),
  };
}
