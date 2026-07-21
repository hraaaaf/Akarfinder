import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runStructuredListingIntelligencePipeline } from "../../../lib/intelligence/structured-listing-pipeline.js";
import { adaptValidatedFeedRow } from "../../../lib/property-schema/adapters.js";
import { FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT } from "../../../lib/partners/partner-listing-examples.js";
import type { ValidatedFeedRow } from "../../../lib/feeds/schema.js";
import type { ScrapedListingP0 } from "../types.js";
import type { Listing } from "../../../lib/listings/types.js";

const NOW = "2026-07-21T19:00:00.000Z";

const FEED_ROW: ValidatedFeedRow = {
  external_id: "feed-1",
  source_name: "Agency Feed",
  source_domain: "agency.example.ma",
  source_url: "https://agency.example.ma/listings/feed-1",
  transaction_type: "sale",
  property_type: "apartment",
  title: "Appartement Maârif",
  description: "Appartement structuré avec données déclarées.",
  city: "Casablanca",
  district: "Maârif",
  price_mad: 800000,
  surface_m2: 100,
  bedrooms_count: 2,
  coordinates: null,
  image_urls: [],
  updated_at_source: NOW,
  update_signal: null,
};

const SCRAPED_ROW: ScrapedListingP0 = {
  source_name: "authorized-source",
  source_url: "https://authorized.example.ma",
  listing_url: "https://authorized.example.ma/a/1",
  title: "Appartement Maârif",
  price_raw: "800000 DH",
  price_mad: 800000,
  city: "Casablanca",
  district: "Maârif",
  property_type: "apartment",
  transaction_type: "sale",
  surface_raw: "100 m2",
  surface_m2: 100,
  rooms_count: 3,
  bedrooms_count: 2,
  bathrooms: 1,
  description_snippet: "Appartement structuré.",
  images_count: 0,
  thumbnail_url: null,
  seller_name: null,
  published_at_raw: null,
  scraped_at: NOW,
  data_completeness_score: 60,
  field_confidence: {
    price: "high",
    city: "high",
    district: "high",
    surface: "high",
    rooms: "medium",
    bedrooms: "medium",
    bathrooms: "medium",
    description: "medium",
    seller: "missing",
  },
  built_surface_m2: null,
  plot_surface_m2: null,
  condition: null,
  property_age_range: null,
  orientation: null,
  floor_type: null,
  floors_count: null,
  garden_m2: null,
  terrace_m2: null,
  garage_spaces: null,
  has_pool: false,
  has_concierge: false,
  has_moroccan_living_room: false,
  has_european_living_room: false,
  has_equipped_kitchen: false,
  premium_features: [],
};

const LEGACY_ROW = {
  id: "legacy-1",
  title: "Appartement Maârif",
  city: "Casablanca",
  neighborhood: "Maârif",
  district: "Maârif",
  price: 800000,
  price_mad: 800000,
  currency: "DH",
  surface_m2: 100,
  price_per_m2: 8000,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 2,
  bedrooms_count: 2,
  bathrooms: 1,
  bathrooms_count: 1,
  freshness_label: "",
  source_type: "Source analysée",
  reliability_label: "Infos limitées",
  reliability_score: 0,
  is_mre_friendly: false,
  description: "Appartement legacy structuré.",
  image_url: "",
  reliability_explanation: "",
  listing_url: "https://legacy.example.ma/1",
  source_name: "legacy-source",
} as Listing;

function context(id: string) {
  return {
    property_id: `property-${id}`,
    offer_id: `offer-${id}`,
    source_id: `source-${id}`,
    source_name: `Source ${id}`,
    external_offer_id: id,
    source_url: `https://source.example.ma/${id}`,
    compliance_status: "allowed" as const,
    now: NOW,
  };
}

function assertCommonPipelineShape(result: ReturnType<typeof runStructuredListingIntelligencePipeline>) {
  assert.equal(result.pipeline_version, "1.0");
  assert.equal(result.stages.adaptation, "completed");
  assert.equal(result.stages.safe_enrichment, "completed");
  assert.equal(result.stages.information_completeness, "completed");
  assert.ok(["completed", "unavailable"].includes(result.stages.freshness));
  assert.equal(result.freshness.version, "2.0");
  assert.equal(result.freshness.contract_validation.valid, true);
  assert.equal(result.anomaly.version, "1.0");
  assert.equal(result.anomaly.contract_validation.valid, true);
  assert.ok(["completed", "unavailable"].includes(result.stages.anomaly_intelligence));
  assert.equal(result.multisource.version, "1.0");
  assert.equal(result.multisource.contract_validation.valid, true);
  assert.ok(["completed", "unavailable"].includes(result.stages.duplicate_intelligence));
  assert.equal(result.stages.akar_score, "not_evaluated");
  assert.equal(result.stages.final_conclusion, "not_evaluated");
  assert.equal(result.stages.property_fit, "not_evaluated");
  assert.ok(result.property.intelligence);
  assert.equal(result.property.intelligence?.data_completeness_score, result.completeness.score);
  assert.equal(result.property.intelligence?.anomaly_score, result.anomaly.anomaly_score);
  assert.equal(result.property.intelligence?.duplicate_score, result.multisource.linkage.confidence_score);
  assert.equal(result.market.contract_validation.valid, true);
}

describe("#12 unified structured listing intelligence pipeline", () => {
  it("routes direct feeds through the canonical pipeline", () => {
    const result = runStructuredListingIntelligencePipeline({ origin: "direct_feed", row: FEED_ROW, context: context("feed") }, NOW);
    assertCommonPipelineShape(result);
    assert.equal(result.origin, "direct_feed");
    assert.equal(result.selected_offer?.external_offer_id, "feed-1");
    assert.equal(result.validation.property_ingestion.valid, true);
    assert.equal(result.validation.offer_ingestion?.valid, true);
    assert.equal(result.validation.publication?.valid, true);
    assert.notEqual(result.selected_offer?.price_amount.value, 0);
    assert.equal(result.stages.freshness, "completed");
    assert.equal(result.stages.anomaly_intelligence, "completed");
    assert.equal(result.stages.duplicate_intelligence, "unavailable");
  });

  it("routes authorized scraper output through the same stages without inventing booleans", () => {
    const result = runStructuredListingIntelligencePipeline({ origin: "authorized_scraper", row: SCRAPED_ROW, context: context("scraper") }, NOW);
    assertCommonPipelineShape(result);
    assert.equal(result.origin, "authorized_scraper");
    assert.equal(result.property.facts.features.has_pool?.value, null);
    assert.equal(result.validation.property_ingestion.valid, true);
    assert.equal(result.stages.freshness, "completed");
  });

  it("routes partner listings through the same pipeline while preserving publication restrictions", () => {
    const result = runStructuredListingIntelligencePipeline({ origin: "partner", row: FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT, context: context("partner") }, NOW);
    assertCommonPipelineShape(result);
    assert.equal(result.origin, "partner");
    assert.equal(result.selected_offer?.seller_type?.value, "agency");
    assert.equal(result.stages.freshness, "completed");
  });

  it("routes legacy DB rows through canonical compatibility adapters before intelligence without fabricating freshness", () => {
    const result = runStructuredListingIntelligencePipeline({ origin: "legacy_db", row: LEGACY_ROW, context: context("legacy") }, NOW);
    assertCommonPipelineShape(result);
    assert.equal(result.origin, "legacy_db");
    assert.equal(result.property.facts.location.city.provenance, "INFERRED");
    assert.equal(result.selected_offer?.price_amount.provenance, "INFERRED");
    assert.equal(result.stages.freshness, "unavailable");
    assert.equal(result.freshness.freshness_state, "unknown");
  });

  it("accepts first-party canonical data without creating a parallel intelligence path", () => {
    const canonical = adaptValidatedFeedRow(FEED_ROW, context("first-party"));
    canonical.offers[0].acquisition_channel = "first_party_user";
    canonical.offers[0].origin_type = "first_party_user";
    const result = runStructuredListingIntelligencePipeline({ origin: "first_party", property: canonical }, NOW);
    assertCommonPipelineShape(result);
    assert.equal(result.origin, "first_party");
    assert.equal(result.selected_offer?.acquisition_channel, "first_party_user");
    assert.equal(result.freshness.verification_channel, "first_party");
  });

  it("keeps missing market inputs as unavailable instead of inventing a position", () => {
    const row = { ...FEED_ROW, price_mad: null, surface_m2: null };
    const result = runStructuredListingIntelligencePipeline({ origin: "direct_feed", row, context: context("missing-market") }, NOW);
    assert.equal(result.market.claim.strength, "unavailable");
    assert.equal(result.stages.market_analysis, "unavailable");
    assert.equal(result.property.intelligence?.market_position, null);
    assert.equal(result.market.contract_validation.valid, true);
    assert.equal(result.anomaly.signals.some((signal) => signal.code === "market_price_outlier"), false);
  });

  it("evaluates freshness and anomaly while leaving only #17+ engines untouched", () => {
    const result = runStructuredListingIntelligencePipeline({ origin: "direct_feed", row: FEED_ROW, context: context("future") }, NOW);
    assert.equal(result.property.intelligence?.freshness_score, 100);
    assert.equal(result.stages.freshness, "completed");
    assert.equal(result.stages.anomaly_intelligence, "completed");
    assert.equal(result.property.intelligence?.anomaly_score, 0);
    assert.equal(result.stages.duplicate_intelligence, "unavailable");
    assert.equal(result.property.intelligence?.duplicate_score, null);
    assert.equal(result.property.intelligence?.akar_score, null);
    assert.equal(result.property.intelligence?.listing_conclusion, null);
    assert.equal(result.property.intelligence?.property_fit_score, null);
  });

  it("runs #16 on multiple canonical offers and keeps every offer separate", () => {
    const canonical = adaptValidatedFeedRow(FEED_ROW, context("multi-a"));
    const first = canonical.offers[0];
    const second = {
      ...first,
      offer_id: "offer-multi-b",
      source_id: "source-multi-b",
      source_name: "Agency B",
      external_offer_id: "multi-b",
      source_url: "https://agency-b.example.ma/multi-b",
      canonical_source_url: "https://agency-b.example.ma/multi-b",
      title: { ...first.title, value: "Appartement Maârif - autre source" },
      price_amount: { ...first.price_amount, value: 1000000 },
    };
    canonical.offers = [first, second];

    const result = runStructuredListingIntelligencePipeline({ origin: "first_party", property: canonical }, NOW, {
      associations: [{
        offer_a_id: first.offer_id,
        offer_b_id: second.offer_id,
        basis: "cross_source_high_confidence",
        matched_signals: ["city", "transaction_type", "property_type", "district", "surface_m2", "bedrooms_count"],
        contradicting_signals: [],
      }],
    });

    assert.equal(result.stages.duplicate_intelligence, "completed");
    assert.equal(result.multisource.offer_count, 2);
    assert.equal(result.multisource.source_count, 2);
    assert.equal(result.multisource.linkage.level, "strong_candidate");
    assert.ok((result.property.intelligence?.duplicate_score ?? 0) >= 70);
    assert.equal(result.property.offers.length, 2, "pipeline must not collapse source offers");
  });

  it("accepts real optional price history without synthesizing it inside the pipeline", () => {
    const withoutHistory = runStructuredListingIntelligencePipeline({ origin: "direct_feed", row: FEED_ROW, context: context("history-none") }, NOW);
    assert.equal(withoutHistory.anomaly.signals.some((signal) => signal.code === "abrupt_price_change"), false);

    const withHistory = runStructuredListingIntelligencePipeline({ origin: "direct_feed", row: FEED_ROW, context: context("history-real") }, NOW, {
      price_history: [
        { observed_at: "2026-07-01T10:00:00.000Z", price_mad: 800000, source_ref: "source-real" },
        { observed_at: "2026-07-10T10:00:00.000Z", price_mad: 1200000, source_ref: "source-real" },
      ],
    });
    assert.equal(withHistory.anomaly.signals.some((signal) => signal.code === "abrupt_price_change"), true);
    assert.ok((withHistory.property.intelligence?.anomaly_score ?? 0) > 0);
  });
});
