import { createHash } from "node:crypto";

import {
  emptyPropertyFacts,
  fact,
  type CanonicalOfferV1,
  type CanonicalPropertyType,
  type CanonicalPropertyV1,
  type MediaAssetV1,
  type OfferOriginType,
} from "../lib/property-schema/core";

export type CollectionSourceType = "portal" | "agency_direct" | "partner_feed" | "owner_direct" | "developer_direct" | "open_data" | "manual";

export type CollectionListing = {
  akar_id: string | null;
  source: {
    name: string;
    source_id: string;
    url: string;
    first_seen_at: string;
    last_seen_at: string;
    scraped_at: string;
    content_hash: string;
  };
  status: "active" | "stale" | "inactive" | "rejected";
  transaction: "sale" | "rent" | null;
  property_type: CanonicalPropertyType | null;
  title: string | null;
  description: string | null;
  price: {
    amount: number | null;
    currency: "MAD";
    period: "total" | "day" | "week" | "month" | "year" | "unknown";
    on_request: boolean;
  };
  surface: {
    total_m2: number | null;
    habitable_m2: number | null;
    built_m2: number | null;
    land_m2: number | null;
  };
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  location: {
    country: "Morocco";
    region: string | null;
    city: string | null;
    district: string | null;
    address_text: string | null;
    latitude: number | null;
    longitude: number | null;
    precision: "exact" | "neighborhood_centroid" | "city_centroid" | "unknown" | null;
  };
  features: string[];
  images: Array<{ url: string; position: number; hash: string | null }>;
  seller: {
    name: string | null;
    type: "agency" | "owner" | "promoter" | "broker" | "unknown" | null;
    source_profile_url: string | null;
  };
  provenance: {
    source_type: CollectionSourceType;
    source_listing_url: string;
    retrieval_method: "crawl" | "api" | "feed" | "manual" | "import";
  };
  quality: { score: number | null; warnings: string[] };
  raw: Record<string, unknown>;
};

export type CanonicalOfferWithCollectionSourceType = CanonicalOfferV1 & {
  source_type: CollectionSourceType;
};

function stableId(prefix: string, value: string): string {
  return `${prefix}-${createHash("sha256").update(value, "utf8").digest("hex").slice(0, 24)}`;
}

function originType(input: CollectionListing): OfferOriginType {
  switch (input.provenance.source_type) {
    case "partner_feed": return "partner_feed";
    case "agency_direct": return "agency_direct";
    case "owner_direct": return "first_party_user";
    default: return "unknown";
  }
}

function offerStatus(input: CollectionListing): CanonicalOfferV1["offer_status"] {
  if (input.status === "inactive") return "inactive";
  if (input.status === "rejected") return "unpublished";
  return "active";
}

export function adaptCollectionListing(input: CollectionListing, ingestionRunId: string | null = null): CanonicalPropertyV1 {
  if (input.transaction == null) {
    throw new Error("collection_listing_transaction_required_for_canonical_offer");
  }

  const propertyId = input.akar_id ?? stableId("property", `${input.source.name}:${input.source.source_id}`);
  const offerId = stableId("offer", `${input.source.name}:${input.source.source_id}`);
  const facts = emptyPropertyFacts();
  const observedAt = input.source.scraped_at;
  const sourceRef = input.source.url;
  const collected = <T>(value: T | null) => fact(value, {
    provenance: "DECLARED",
    confidence: value == null ? "unknown" : "medium",
    observed_at: observedAt,
    source_ref: sourceRef,
  });

  facts.classification.property_type = collected(input.property_type ?? "unknown");
  facts.classification.market_segment = collected("unknown");
  facts.location.country = collected("Morocco");
  facts.location.region = collected(input.location.region);
  facts.location.city = collected(input.location.city);
  facts.location.district = collected(input.location.district);
  facts.location.address_display = collected(input.location.address_text);
  facts.location.latitude = collected(input.location.latitude);
  facts.location.longitude = collected(input.location.longitude);
  facts.location.geo_precision = collected(input.location.precision ?? "unknown");
  facts.location.geo_source = collected(input.location.latitude != null && input.location.longitude != null ? "scraped_coordinates" : "unknown");
  facts.surfaces.surface_total_m2 = collected(input.surface.total_m2);
  facts.surfaces.surface_habitable_m2 = collected(input.surface.habitable_m2);
  facts.surfaces.surface_built_m2 = collected(input.surface.built_m2);
  facts.surfaces.surface_land_m2 = collected(input.surface.land_m2);
  facts.layout.rooms_count = collected(input.rooms);
  facts.layout.bedrooms_count = collected(input.bedrooms);
  facts.layout.bathrooms_count = collected(input.bathrooms);
  facts.building.floor_number = collected(input.floor);

  const featureSet = new Set(input.features.map((v) => v.trim().toLowerCase()));
  facts.features.has_elevator = collected(featureSet.has("elevator") ? true : null);
  facts.features.has_parking = collected(featureSet.has("parking") ? true : null);
  facts.features.has_garage = collected(featureSet.has("garage") ? true : null);
  facts.features.has_pool = collected(featureSet.has("pool") ? true : null);
  facts.features.has_garden = collected(featureSet.has("garden") ? true : null);
  facts.features.has_balcony = collected(featureSet.has("balcony") ? true : null);
  facts.features.is_furnished = collected(featureSet.has("furnished") ? true : null);
  facts.features.premium_features = collected(input.features.length ? input.features : null);

  const offer: CanonicalOfferWithCollectionSourceType = {
    offer_id: offerId,
    property_id: propertyId,
    source_id: input.source.name,
    source_name: input.source.name,
    external_offer_id: input.source.source_id,
    source_url: input.source.url,
    canonical_source_url: input.provenance.source_listing_url,
    acquisition_channel: input.provenance.retrieval_method === "feed" ? "partner_feed" : input.provenance.retrieval_method === "manual" ? "manual_partner" : "source_page",
    origin_type: originType(input),
    source_type: input.provenance.source_type,
    transaction_type: input.transaction,
    title: collected(input.title),
    description: collected(input.description),
    price_amount: collected(input.price.amount),
    price_currency: "MAD",
    price_period: input.price.period === "week" || input.price.period === "year" ? "unknown" : input.price.period,
    price_status: input.price.on_request || input.price.amount == null ? "not_disclosed" : "valid",
    availability_status: input.status === "inactive" ? "withdrawn" : "unknown",
    seller_type: collected(input.seller.type ?? "unknown"),
    published_at_source: null,
    first_observed_at: input.source.first_seen_at,
    last_observed_at: input.source.last_seen_at,
    updated_at_source: null,
    offer_status: offerStatus(input),
    compliance_status: input.provenance.source_type === "partner_feed" || input.provenance.source_type === "agency_direct" ? "allowed" : "review_required",
    media_set_id: input.images.length ? stableId("media", offerId) : null,
    ingestion_run_id: ingestionRunId,
  };

  const media: MediaAssetV1[] = input.images.map((image) => ({
    media_id: stableId("media", `${offerId}:${image.position}:${image.url}`),
    property_id: propertyId,
    offer_id: offerId,
    type: "image",
    url: image.url,
    source_url: input.source.url,
    rights_status: input.provenance.source_type === "partner_feed" || input.provenance.source_type === "agency_direct" ? "allowed" : "unknown",
    publication_permission: input.provenance.source_type === "partner_feed" || input.provenance.source_type === "agency_direct" ? "allowed" : "unknown",
    cache_permission: false,
    download_permission: false,
    attribution: input.seller.name ?? input.source.name,
    observed_at: observedAt,
    last_checked_at: null,
  }));

  return {
    property_id: propertyId,
    schema_version: "1.0",
    canonical_status: input.status === "inactive" ? "inactive" : "active",
    project_id: null,
    project_unit_id: null,
    facts,
    offers: [offer],
    media,
    intelligence: null,
    display_policies: [],
    created_at: input.source.first_seen_at,
    updated_at: input.source.last_seen_at,
  };
}
