import type { Listing } from "../listings/types";
import type { PartnerListingStandard } from "../partners/partner-listing-types";
import type { ValidatedFeedRow } from "../feeds/schema";
import type { ScrapedListingP0, FieldConfidenceLevel } from "../../scripts/scrapers/types";
import {
  PROPERTY_SCHEMA_VERSION,
  emptyPropertyFacts,
  fact,
  type AcquisitionChannel,
  type CanonicalFact,
  type CanonicalOfferV1,
  type CanonicalPropertyType,
  type CanonicalPropertyV1,
  type FactConfidence,
  type MediaAssetV1,
  type OfferComplianceStatus,
  type OfferOriginType,
  type ProvenanceKind,
} from "./core";

export interface AdapterContextV1 {
  property_id: string;
  offer_id: string;
  source_id: string;
  source_name?: string;
  now?: string;
  acquisition_channel?: AcquisitionChannel;
  origin_type?: OfferOriginType;
  compliance_status?: OfferComplianceStatus;
  ingestion_run_id?: string | null;
}

function normalizePropertyType(raw: string | null | undefined): CanonicalPropertyType {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "appartement": case "apartment": return "apartment";
    case "villa": return "villa";
    case "maison": case "house": return "house";
    case "studio": return "studio";
    case "duplex": return "duplex";
    case "riad": return "riad";
    case "terrain": case "land": return "land";
    case "bureau": case "office": return "office";
    case "retail": case "commercial": return "commercial";
    case "warehouse": return "warehouse";
    case "industrial": return "industrial";
    case "farm": return "farm";
    case "building": return "building";
    case "other": return "other";
    default: return "unknown";
  }
}

function nowFrom(context: AdapterContextV1) {
  return context.now ?? new Date().toISOString();
}

function confidenceFromScraper(level: FieldConfidenceLevel | undefined): FactConfidence {
  return level ?? "unknown";
}

function declared<T>(value: T | null, context: AdapterContextV1, confidence: FactConfidence = "high"): CanonicalFact<T> {
  return fact(value, {
    provenance: "DECLARED",
    confidence: value == null ? "unknown" : confidence,
    observed_at: nowFrom(context),
    source_ref: context.source_id,
  });
}

function legacy<T>(value: T | null, context: AdapterContextV1): CanonicalFact<T> {
  return fact(value, {
    provenance: "INFERRED",
    confidence: value == null ? "unknown" : "low",
    observed_at: nowFrom(context),
    source_ref: context.source_id,
  });
}

function baseProperty(context: AdapterContextV1): CanonicalPropertyV1 {
  const now = nowFrom(context);
  return {
    property_id: context.property_id,
    schema_version: PROPERTY_SCHEMA_VERSION,
    canonical_status: "active",
    project_id: null,
    project_unit_id: null,
    facts: emptyPropertyFacts(),
    offers: [],
    media: [],
    intelligence: null,
    display_policies: [],
    created_at: now,
    updated_at: now,
  };
}

function makeOffer(
  context: AdapterContextV1,
  input: Partial<CanonicalOfferV1> & Pick<CanonicalOfferV1, "transaction_type" | "title" | "description" | "price_amount" | "price_status" | "availability_status">,
): CanonicalOfferV1 {
  return {
    offer_id: context.offer_id,
    property_id: context.property_id,
    source_id: context.source_id,
    source_name: context.source_name ?? context.source_id,
    external_offer_id: null,
    source_url: null,
    canonical_source_url: null,
    acquisition_channel: context.acquisition_channel ?? "system",
    origin_type: context.origin_type ?? "unknown",
    transaction_type: input.transaction_type,
    title: input.title,
    description: input.description,
    price_amount: input.price_amount,
    price_currency: "MAD",
    price_period: input.price_period ?? (input.transaction_type === "rent" ? "month" : "total"),
    price_status: input.price_status,
    availability_status: input.availability_status,
    published_at_source: null,
    first_observed_at: null,
    last_observed_at: null,
    updated_at_source: null,
    offer_status: "active",
    compliance_status: context.compliance_status ?? "review_required",
    media_set_id: null,
    ingestion_run_id: context.ingestion_run_id ?? null,
    ...input,
  };
}

export function adaptValidatedFeedRow(row: ValidatedFeedRow, context: AdapterContextV1): CanonicalPropertyV1 {
  const property = baseProperty(context);
  property.facts.classification.property_type = declared(normalizePropertyType(row.property_type), context);
  property.facts.classification.market_segment = declared("unknown", context, "low");
  property.facts.location.country = declared("Morocco", context);
  property.facts.location.city = declared(row.city || null, context);
  property.facts.location.district = declared(row.district, context);
  property.facts.surfaces.surface_total_m2 = declared(row.surface_m2, context);
  property.facts.layout.bedrooms_count = declared(row.bedrooms_count, context);
  if (row.coordinates) {
    property.facts.location.latitude = declared(row.coordinates.lat, context);
    property.facts.location.longitude = declared(row.coordinates.lng, context);
    property.facts.location.geo_precision = declared("exact", context);
    property.facts.location.geo_source = declared("declared", context);
  }

  const transactionType = row.transaction_type === "rent" ? "rent" : "sale";
  const offer = makeOffer(context, {
    external_offer_id: row.external_id,
    source_url: row.source_url,
    canonical_source_url: row.source_url,
    acquisition_channel: "partner_feed",
    origin_type: "partner_feed",
    transaction_type: transactionType,
    title: declared(row.title || null, context),
    description: declared(row.description, context),
    price_amount: declared(row.price_mad, context),
    price_status: row.price_mad == null ? "not_disclosed" : "valid",
    availability_status: row.update_signal ? "withdrawn" : "available",
    updated_at_source: row.updated_at_source,
    offer_status: row.update_signal === "delete" ? "deleted" : row.update_signal === "unpublish" ? "unpublished" : "active",
  });
  property.offers = [offer];
  property.media = row.image_urls.map((url, index): MediaAssetV1 => ({
    media_id: `${context.offer_id}:image:${index + 1}`,
    property_id: context.property_id,
    offer_id: context.offer_id,
    type: "image",
    url,
    source_url: row.source_url,
    rights_status: "allowed",
    publication_permission: "allowed",
    cache_permission: false,
    download_permission: false,
    attribution: context.source_name ?? row.source_name,
    observed_at: nowFrom(context),
    last_checked_at: null,
  }));
  return property;
}

export function adaptScrapedListing(row: ScrapedListingP0, context: AdapterContextV1): CanonicalPropertyV1 {
  const property = baseProperty(context);
  const sf = <T>(value: T | null, level: FieldConfidenceLevel | undefined): CanonicalFact<T> => fact(value, {
    provenance: "DECLARED",
    confidence: confidenceFromScraper(level),
    observed_at: row.scraped_at,
    source_ref: row.listing_url,
  });
  property.facts.classification.property_type = sf(normalizePropertyType(row.property_type), "high");
  property.facts.classification.market_segment = sf("unknown", "low");
  property.facts.location.country = sf("Morocco", "high");
  property.facts.location.city = sf(row.city, row.field_confidence.city);
  property.facts.location.district = sf(row.district, row.field_confidence.district);
  property.facts.surfaces.surface_total_m2 = sf(row.surface_m2, row.field_confidence.surface);
  property.facts.surfaces.surface_built_m2 = sf(row.built_surface_m2, row.field_confidence.surface);
  property.facts.surfaces.surface_land_m2 = sf(row.plot_surface_m2, row.field_confidence.surface);
  property.facts.layout.rooms_count = sf(row.rooms_count, row.field_confidence.rooms);
  property.facts.layout.bedrooms_count = sf(row.bedrooms_count, row.field_confidence.bedrooms);
  property.facts.layout.bathrooms_count = sf(row.bathrooms, row.field_confidence.bathrooms);
  property.facts.condition.condition = sf(row.condition, "medium");
  property.facts.building.orientation = sf(row.orientation, "medium");
  property.facts.building.floor_type = sf(row.floor_type, "medium");
  property.facts.building.floors_count = sf(row.floors_count, "medium");
  property.facts.surfaces.garden_m2 = sf(row.garden_m2, "medium");
  property.facts.surfaces.terrace_m2 = sf(row.terrace_m2, "medium");
  property.facts.features.garage_spaces = sf(row.garage_spaces, "medium");
  property.facts.features.has_pool = sf(row.has_pool ? true : null, row.has_pool ? "medium" : "missing");
  property.facts.features.has_concierge = sf(row.has_concierge ? true : null, row.has_concierge ? "medium" : "missing");
  property.facts.features.has_equipped_kitchen = sf(row.has_equipped_kitchen ? true : null, row.has_equipped_kitchen ? "medium" : "missing");
  property.facts.features.premium_features = sf(row.premium_features.length ? row.premium_features : null, row.premium_features.length ? "medium" : "missing");

  const offer = makeOffer(context, {
    source_name: row.source_name,
    source_url: row.listing_url,
    canonical_source_url: row.listing_url,
    acquisition_channel: "source_page",
    origin_type: "legacy_import",
    transaction_type: row.transaction_type === "rent" ? "rent" : "sale",
    title: sf(row.title, "high"),
    description: sf(row.description_snippet, row.field_confidence.description),
    price_amount: sf(row.price_mad, row.field_confidence.price),
    price_status: row.price_mad == null ? "not_disclosed" : "valid",
    availability_status: "unknown",
    first_observed_at: row.scraped_at,
    last_observed_at: row.scraped_at,
    offer_status: "active",
  });
  property.offers = [offer];
  return property;
}

export function adaptPartnerListing(row: PartnerListingStandard, context: AdapterContextV1): CanonicalPropertyV1 {
  const property = baseProperty(context);
  property.facts.classification.property_type = declared(normalizePropertyType(row.property_type), context);
  property.facts.classification.market_segment = declared(row.transaction_type === "new" || row.property_type === "project" ? "new_build" : "resale", context);
  property.facts.location.country = declared("Morocco", context);
  property.facts.location.city = declared(row.city || null, context);
  property.facts.location.district = declared(row.district || null, context);
  property.facts.surfaces.surface_total_m2 = declared(row.surface_m2 > 0 ? row.surface_m2 : null, context);
  property.facts.layout.bedrooms_count = declared(row.bedrooms ?? null, context);
  property.facts.layout.bathrooms_count = declared(row.bathrooms ?? null, context);
  property.facts.building.floor_number = declared(row.floor ?? null, context);
  property.facts.building.orientation = declared(row.orientation ?? null, context);
  property.facts.features.has_elevator = declared(row.elevator ?? null, context);
  property.facts.features.has_parking = declared(row.parking ?? null, context);
  property.facts.features.has_terrace = declared(row.terrace ?? null, context);
  property.facts.features.is_furnished = declared(row.furnished ?? null, context);
  property.facts.condition.condition = declared(row.condition ?? null, context);
  if (row.latitude != null && row.longitude != null) {
    property.facts.location.latitude = declared(row.latitude, context);
    property.facts.location.longitude = declared(row.longitude, context);
    property.facts.location.geo_precision = declared(row.location_level === "exact_address_authorized" ? "exact" : "neighborhood_centroid", context);
    property.facts.location.geo_source = declared("declared", context);
  }

  const exactPrice = row.price_display_mode === "exact" ? row.price_amount ?? null : null;
  const offer = makeOffer(context, {
    source_name: context.source_name ?? row.partner_id,
    acquisition_channel: "manual_partner",
    origin_type: "partner_feed",
    transaction_type: row.transaction_type === "rent" ? "rent" : "sale",
    title: declared(row.title || null, context),
    description: declared(row.normalized_description || row.short_description || null, context),
    price_amount: declared(exactPrice, context),
    price_status: row.price_display_mode === "exact" ? (exactPrice == null ? "not_disclosed" : "valid") : row.price_display_mode === "on_request" ? "not_disclosed" : "ambiguous",
    availability_status: row.availability_status,
    updated_at_source: row.last_partner_update_at ?? null,
    seller_type: declared(row.partner_type === "promoter" ? "promoter" : "agency", context),
    seller_organization_id: row.partner_id,
    compliance_status: "allowed",
    offer_status: ["sold", "rented"].includes(row.availability_status) ? "inactive" : "active",
  });
  property.offers = [offer];
  return property;
}

export function adaptLegacyListing(row: Listing, context: AdapterContextV1): CanonicalPropertyV1 {
  const property = baseProperty(context);
  property.facts.classification.property_type = legacy(normalizePropertyType(row.property_type), context);
  property.facts.classification.market_segment = legacy(row.transaction_type === "new" ? "new_build" : "unknown", context);
  property.facts.location.country = legacy("Morocco", context);
  property.facts.location.city = legacy(row.city || null, context);
  property.facts.location.district = legacy(row.district ?? row.neighborhood ?? null, context);
  property.facts.surfaces.surface_total_m2 = legacy(row.surface_m2 > 0 ? row.surface_m2 : null, context);
  property.facts.surfaces.surface_built_m2 = legacy(row.built_surface_m2 && row.built_surface_m2 > 0 ? row.built_surface_m2 : null, context);
  property.facts.surfaces.surface_land_m2 = legacy(row.plot_surface_m2 && row.plot_surface_m2 > 0 ? row.plot_surface_m2 : null, context);
  property.facts.layout.rooms_count = legacy(row.rooms_count ?? null, context);
  property.facts.layout.bedrooms_count = legacy((row.bedrooms_count ?? row.bedrooms) > 0 ? (row.bedrooms_count ?? row.bedrooms) : null, context);
  property.facts.layout.bathrooms_count = legacy((row.bathrooms_count ?? row.bathrooms) > 0 ? (row.bathrooms_count ?? row.bathrooms) : null, context);
  property.facts.condition.condition = legacy(row.condition ?? null, context);
  property.facts.building.orientation = legacy(row.orientation ?? null, context);
  property.facts.features.has_pool = legacy(row.has_pool === true ? true : null, context);
  property.facts.features.has_concierge = legacy(row.has_concierge === true ? true : null, context);
  property.facts.features.has_equipped_kitchen = legacy(row.has_equipped_kitchen === true ? true : null, context);

  const price = row.price_mad ?? row.price;
  const offer = makeOffer(context, {
    source_name: row.source_name ?? context.source_name ?? context.source_id,
    source_url: row.listing_url ?? null,
    canonical_source_url: row.listing_url ?? null,
    acquisition_channel: context.acquisition_channel ?? "system",
    origin_type: context.origin_type ?? "legacy_import",
    transaction_type: row.transaction_type === "rent" ? "rent" : "sale",
    title: legacy(row.title || null, context),
    description: legacy(row.description_snippet ?? row.description ?? null, context),
    price_amount: legacy(price && price > 0 ? price : null, context),
    price_status: price && price > 0 ? "valid" : "not_disclosed",
    availability_status: "unknown",
    offer_status: "active",
  });
  property.offers = [offer];
  return property;
}

export function withProvenance<T>(value: T | null, provenance: ProvenanceKind, confidence: FactConfidence = "medium"): CanonicalFact<T> {
  return fact(value, { provenance, confidence: value == null ? "unknown" : confidence });
}
