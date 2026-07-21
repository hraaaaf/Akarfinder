import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptValidatedFeedRow } from "../../../lib/property-schema/adapters.js";
import { evaluateMultiSourcePropertyIntelligenceV1 } from "../../../lib/intelligence/multisource-property-intelligence-v1.js";
import type { ValidatedFeedRow } from "../../../lib/feeds/schema.js";
import type { CanonicalOfferV1, CanonicalPropertyV1 } from "../../../lib/property-schema/core.js";

const NOW = "2026-07-21T20:30:00.000Z";

const ROW: ValidatedFeedRow = {
  external_id: "offer-a",
  source_name: "Agency A",
  source_domain: "agency-a.example.ma",
  source_url: "https://agency-a.example.ma/a",
  transaction_type: "sale",
  property_type: "apartment",
  title: "Appartement Agdal 100 m2",
  description: "Offre structurée A",
  city: "Rabat",
  district: "Agdal",
  price_mad: 1800000,
  surface_m2: 100,
  bedrooms_count: 3,
  coordinates: null,
  image_urls: [],
  updated_at_source: NOW,
  update_signal: null,
};

function context(id: string) {
  return {
    property_id: "property-multi",
    offer_id: id,
    source_id: `source-${id}`,
    source_name: `Source ${id}`,
    external_offer_id: id,
    source_url: `https://${id}.example.ma/listing`,
    compliance_status: "allowed" as const,
    now: NOW,
  };
}

function propertyWithOffers(): CanonicalPropertyV1 {
  const property = adaptValidatedFeedRow(ROW, context("offer-a"));
  const first = property.offers[0];
  const second: CanonicalOfferV1 = {
    ...first,
    offer_id: "offer-b",
    source_id: "source-b",
    source_name: "Agency B",
    external_offer_id: "b-123",
    source_url: "https://agency-b.example.ma/b",
    canonical_source_url: "https://agency-b.example.ma/b",
    title: { ...first.title, value: "Appartement Agdal autre annonce" },
    description: { ...first.description, value: "Offre structurée B" },
    price_amount: { ...first.price_amount, value: 2400000, source_ref: "https://agency-b.example.ma/b" },
    availability_status: "reserved",
  };
  return { ...property, offers: [first, second] };
}

describe("#16 Multi-source Property Intelligence V1", () => {
  it("keeps a single-offer property unavailable instead of inventing duplicate confidence", () => {
    const property = adaptValidatedFeedRow(ROW, context("single"));
    const result = evaluateMultiSourcePropertyIntelligenceV1(property, NOW);
    assert.equal(result.status, "insufficient_data");
    assert.equal(result.offer_count, 1);
    assert.equal(result.linkage.level, "unresolved");
    assert.equal(result.linkage.confidence_score, null);
    assert.equal(result.claim.strength, "unavailable");
    assert.equal(result.contract_validation.valid, true);
  });

  it("summarizes multiple offers without claiming identity when association evidence is absent", () => {
    const property = propertyWithOffers();
    const result = evaluateMultiSourcePropertyIntelligenceV1(property, NOW);
    assert.equal(result.status, "evaluated");
    assert.equal(result.offer_count, 2);
    assert.equal(result.source_count, 2);
    assert.equal(result.is_multi_source, true);
    assert.equal(result.linkage.level, "unresolved");
    assert.equal(result.linkage.confidence_score, null);
    assert.equal(result.claim.strength, "unavailable");
    assert.equal(property.offers.length, 2, "source offers must remain separate");
  });

  it("treats an explicit partner identifier as strong evidence without collapsing source offers", () => {
    const property = propertyWithOffers();
    const result = evaluateMultiSourcePropertyIntelligenceV1(property, NOW, {
      associations: [{
        offer_a_id: "offer-a",
        offer_b_id: "offer-b",
        basis: "explicit_partner_identifier",
        matched_signals: ["partner_property_id"],
      }],
    });
    assert.equal(result.linkage.level, "explicitly_supported");
    assert.equal(result.linkage.confidence, "high");
    assert.ok((result.linkage.confidence_score ?? 0) >= 95);
    assert.equal(result.linkage.strong_component_coverage, 1);
    assert.equal(result.claim.strength, "inferred");
    assert.equal(result.contract_validation.valid, true);
    assert.equal(result.offer_count, 2);
  });

  it("accepts a validated cross-source heuristic only with at least three corroborating structured signals and no contradiction", () => {
    const property = propertyWithOffers();
    const result = evaluateMultiSourcePropertyIntelligenceV1(property, NOW, {
      associations: [{
        offer_a_id: "offer-a",
        offer_b_id: "offer-b",
        basis: "cross_source_high_confidence",
        matched_signals: ["city", "transaction_type", "property_type", "district", "surface_m2", "bedrooms_count"],
        contradicting_signals: [],
      }],
    });
    assert.equal(result.linkage.level, "strong_candidate");
    assert.equal(result.linkage.confidence, "medium");
    assert.ok((result.linkage.confidence_score ?? 0) >= 70);
  });

  it("downgrades a heuristic association when a structured contradiction is present", () => {
    const property = propertyWithOffers();
    const result = evaluateMultiSourcePropertyIntelligenceV1(property, NOW, {
      associations: [{
        offer_a_id: "offer-a",
        offer_b_id: "offer-b",
        basis: "cross_source_high_confidence",
        matched_signals: ["city", "transaction_type", "property_type", "district", "surface_m2", "bedrooms_count"],
        contradicting_signals: ["price_mad"],
      }],
    });
    assert.equal(result.linkage.level, "possible_candidate");
    assert.equal(result.linkage.confidence, "low");
    assert.equal(result.linkage.contradictions_present, true);
    assert.ok((result.linkage.confidence_score ?? 100) <= 49);
  });

  it("preserves price and availability divergences instead of manufacturing a consensus value", () => {
    const property = propertyWithOffers();
    const result = evaluateMultiSourcePropertyIntelligenceV1(property, NOW);
    assert.equal(result.price_summary.min_asking_price_mad, 1800000);
    assert.equal(result.price_summary.max_asking_price_mad, 2400000);
    assert.equal(result.price_summary.spread_percent, 33.3);
    assert.ok(result.divergences.some((item) => item.code === "asking_price"));
    assert.ok(result.divergences.some((item) => item.code === "availability"));
    assert.equal(result.offer_count, 2);
  });

  it("ignores association evidence that references offers outside the canonical property", () => {
    const property = propertyWithOffers();
    const result = evaluateMultiSourcePropertyIntelligenceV1(property, NOW, {
      associations: [{ offer_a_id: "offer-a", offer_b_id: "foreign-offer", basis: "manual_review" }],
    });
    assert.equal(result.linkage.association_evidence_count, 0);
    assert.equal(result.linkage.level, "unresolved");
    assert.equal(result.linkage.confidence_score, null);
  });
});
