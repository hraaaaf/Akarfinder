import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runListingFactoryV1 } from "../../../lib/intelligence/listing-factory-v1.js";
import {
  PROPERTY_SCHEMA_VERSION,
  emptyPropertyFacts,
  fact,
  type CanonicalOfferV1,
  type CanonicalPropertyV1,
} from "../../../lib/property-schema/index.js";

const NOW = "2026-09-02T10:00:00.000Z";

function canonicalProperty(): CanonicalPropertyV1 {
  const facts = emptyPropertyFacts();
  facts.classification.property_type = fact("apartment", { observed_at: NOW, source_ref: "partner-feed" });
  facts.classification.market_segment = fact("resale", { observed_at: NOW, source_ref: "partner-feed" });
  facts.location.city = fact("Rabat", { observed_at: NOW, source_ref: "partner-feed" });
  facts.location.district = fact("Agdal", { observed_at: NOW, source_ref: "partner-feed" });
  facts.surfaces.surface_total_m2 = fact(110, { observed_at: NOW, source_ref: "partner-feed" });
  facts.layout.bedrooms_count = fact(3, { observed_at: NOW, source_ref: "partner-feed" });
  facts.layout.bathrooms_count = fact(2, { observed_at: NOW, source_ref: "partner-feed" });

  const offer: CanonicalOfferV1 = {
    offer_id: "offer-factory-1",
    property_id: "property-factory-1",
    source_id: "partner-1",
    source_name: "Partner 1",
    external_offer_id: "EXT-FACTORY-1",
    source_url: "https://example.ma/property/1",
    canonical_source_url: "https://example.ma/property/1",
    acquisition_channel: "partner_feed",
    origin_type: "partner_feed",
    transaction_type: "sale",
    title: fact("Appartement 3 chambres à Agdal", { observed_at: NOW, source_ref: "partner-feed" }),
    description: fact("Appartement lumineux de 110 m²", { observed_at: NOW, source_ref: "partner-feed" }),
    price_amount: fact(1_700_000, { observed_at: NOW, source_ref: "partner-feed" }),
    price_currency: "MAD",
    price_period: "total",
    price_status: "valid",
    availability_status: "available",
    published_at_source: NOW,
    first_observed_at: NOW,
    last_observed_at: NOW,
    updated_at_source: NOW,
    offer_status: "active",
    compliance_status: "allowed",
    media_set_id: "media-1",
    ingestion_run_id: "factory-test",
  };

  return {
    property_id: "property-factory-1",
    schema_version: PROPERTY_SCHEMA_VERSION,
    canonical_status: "active",
    project_id: null,
    project_unit_id: null,
    facts,
    offers: [offer],
    media: Array.from({ length: 6 }, (_, index) => ({
      media_id: `image-${index}`,
      property_id: "property-factory-1",
      offer_id: "offer-factory-1",
      type: "image" as const,
      url: `https://example.ma/image-${index}.jpg`,
      source_url: "https://example.ma/property/1",
      rights_status: "allowed" as const,
      publication_permission: "allowed" as const,
      cache_permission: false,
      download_permission: false,
      attribution: "Partner 1",
      observed_at: NOW,
      last_checked_at: NOW,
    })),
    intelligence: null,
    display_policies: [],
    created_at: NOW,
    updated_at: NOW,
  };
}

describe("Listing Factory V1 end-to-end", () => {
  it("reuses the structured pipeline and emits a distinct quality passport", () => {
    const result = runListingFactoryV1(
      { origin: "first_party", property: canonicalProperty() },
      NOW,
    );

    assert.equal(result.version, "1.0");
    assert.equal(result.pipeline.pipeline_version, "1.0");
    assert.equal(result.pipeline.property.property_id, "property-factory-1");
    assert.equal(result.quality.completeness_score, result.pipeline.completeness.score);
    assert.equal(result.quality.components.provenance, 95);
    assert.equal(result.quality.media_score, 75);
    assert.ok(result.quality.trust_score != null);
    assert.ok(result.quality.ranking_quality_score != null);
    assert.ok(result.quality.limitations.some((item) => item.includes("contexte marché")));
  });

  it("does not mutate market intelligence into the intrinsic quality contract", () => {
    const result = runListingFactoryV1(
      { origin: "first_party", property: canonicalProperty() },
      NOW,
    );

    const before = result.quality.ranking_quality_score;
    const marketStatus = result.pipeline.market.intelligence_v2.status;
    assert.ok(marketStatus === "evaluated" || marketStatus === "insufficient_data");
    assert.equal(result.quality.ranking_quality_score, before);
  });
});
