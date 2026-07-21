import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateMarketIntelligenceV2,
  MARKET_BENCHMARK_AGING_MAX_AGE_DAYS,
  MARKET_BENCHMARK_CURRENT_MAX_AGE_DAYS,
} from "../../../lib/market/market-intelligence-v2.js";
import { runStructuredListingIntelligencePipeline } from "../../../lib/intelligence/structured-listing-pipeline.js";
import type { ValidatedFeedRow } from "../../../lib/feeds/schema.js";

const NOW = "2026-07-21T19:00:00.000Z";

function baseInput() {
  return {
    city: "Casablanca",
    neighborhood: "Maârif",
    property_type: "apartment",
    transaction_type: "sale" as const,
    market_segment: "resale" as const,
    surface_m2: 100,
    asking_price_mad: 800000,
    generated_at: NOW,
  };
}

const FEED_ROW: ValidatedFeedRow = {
  external_id: "market-v2-feed-1",
  source_name: "Agency Feed",
  source_domain: "agency.example.ma",
  source_url: "https://agency.example.ma/listings/market-v2-feed-1",
  transaction_type: "sale",
  property_type: "apartment",
  title: "Appartement Maârif",
  description: "Appartement structuré avec prix demandé.",
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

describe("#14 Market Intelligence V2", () => {
  it("uses an exact neighborhood reference but caps confidence when sample size and dispersion are unpublished", () => {
    const result = evaluateMarketIntelligenceV2(baseInput());

    assert.equal(result.version, "2.0");
    assert.equal(result.status, "evaluated");
    assert.equal(result.reason_code, "ok");
    assert.equal(result.benchmark.match_level, "exact_neighborhood");
    assert.equal(result.benchmark.fallback_used, false);
    assert.equal(result.benchmark.scope, "neighborhood");
    assert.equal(result.benchmark.underlying_sample_size, null);
    assert.equal(result.benchmark.dispersion_pct, null);
    assert.equal(result.benchmark.sample_transparency, "unknown");
    assert.equal(result.benchmark.dispersion_transparency, "unknown");
    assert.equal(result.confidence, "medium");
    assert.equal(result.asking_price.basis, "asking_price");
    assert.equal(result.asking_price.price_per_m2, 8000);
    assert.notEqual(result.comparison.position, "insufficient_data");
  });

  it("makes neighborhood -> city fallback explicit and lowers confidence", () => {
    const result = evaluateMarketIntelligenceV2({
      ...baseInput(),
      neighborhood: "Quartier qui n'existe pas dans le registre",
    });

    assert.equal(result.status, "evaluated");
    assert.equal(result.benchmark.match_level, "city_fallback");
    assert.equal(result.benchmark.fallback_used, true);
    assert.equal(result.benchmark.scope, "city");
    assert.equal(result.confidence, "low");
    assert.ok(result.limitations.some((item) => item.toLowerCase().includes("fallback")));
  });

  it("treats a direct city reference as lower-confidence than an exact neighborhood reference", () => {
    const result = evaluateMarketIntelligenceV2({
      ...baseInput(),
      neighborhood: null,
    });

    assert.equal(result.status, "evaluated");
    assert.equal(result.benchmark.match_level, "city_direct");
    assert.equal(result.benchmark.fallback_used, false);
    assert.equal(result.confidence, "low");
  });

  it("never compares rent against the sale benchmark", () => {
    const result = evaluateMarketIntelligenceV2({
      ...baseInput(),
      transaction_type: "rent",
      asking_price_mad: 8000,
    });

    assert.equal(result.status, "insufficient_data");
    assert.equal(result.reason_code, "rental_benchmark_unavailable");
    assert.equal(result.compatibility.transaction, "incompatible");
    assert.equal(result.comparison.position, "insufficient_data");
    assert.equal(result.gap.price_gap_percent, null);
  });

  it("does not compare explicitly new-build or off-plan stock to an unsegmented benchmark", () => {
    for (const marketSegment of ["new_build", "off_plan"] as const) {
      const result = evaluateMarketIntelligenceV2({
        ...baseInput(),
        market_segment: marketSegment,
      });
      assert.equal(result.status, "insufficient_data");
      assert.equal(result.reason_code, "new_build_segment_benchmark_unavailable");
      assert.equal(result.compatibility.market_segment, "incompatible");
      assert.equal(result.comparison.position, "insufficient_data");
    }
  });

  it("returns insufficient_data for unsupported property types", () => {
    const result = evaluateMarketIntelligenceV2({
      ...baseInput(),
      property_type: "office",
    });

    assert.equal(result.status, "insufficient_data");
    assert.equal(result.reason_code, "unsupported_property_type");
    assert.equal(result.comparison.position, "insufficient_data");
  });

  it("expires a benchmark that is older than the allowed aging window", () => {
    const result = evaluateMarketIntelligenceV2({
      ...baseInput(),
      generated_at: "2028-07-21T19:00:00.000Z",
    });

    assert.equal(result.benchmark.freshness, "stale");
    assert.ok((result.benchmark.age_days ?? 0) > MARKET_BENCHMARK_AGING_MAX_AGE_DAYS);
    assert.equal(result.status, "insufficient_data");
    assert.equal(result.reason_code, "benchmark_stale");
    assert.equal(result.comparison.position, "insufficient_data");
  });

  it("keeps the current/aging benchmark boundaries explicit", () => {
    const observedAt = new Date("2026-07-01T19:24:38.930Z").getTime();
    const currentBoundary = new Date(observedAt + MARKET_BENCHMARK_CURRENT_MAX_AGE_DAYS * 86_400_000).toISOString();
    const agingBoundary = new Date(observedAt + MARKET_BENCHMARK_AGING_MAX_AGE_DAYS * 86_400_000).toISOString();

    assert.equal(evaluateMarketIntelligenceV2({ ...baseInput(), generated_at: currentBoundary }).benchmark.freshness, "current");
    assert.equal(
      evaluateMarketIntelligenceV2({ ...baseInput(), generated_at: new Date(new Date(currentBoundary).getTime() + 86_400_000).toISOString() }).benchmark.freshness,
      "aging",
    );
    assert.equal(evaluateMarketIntelligenceV2({ ...baseInput(), generated_at: agingBoundary }).benchmark.freshness, "aging");
  });

  it("distinguishes AkarFinder benchmark observation time from unknown upstream update time", () => {
    const result = evaluateMarketIntelligenceV2(baseInput());

    assert.ok(result.benchmark.observed_at);
    assert.equal(result.benchmark.source_updated_at, null);
    assert.ok(result.limitations.some((item) => item.includes("date de mise à jour amont")));
  });

  it("integrates V2 into the unified structured pipeline and populates only defensible market fields", () => {
    const result = runStructuredListingIntelligencePipeline({
      origin: "direct_feed",
      row: FEED_ROW,
      context: context("market-v2"),
    }, NOW);

    assert.equal(result.market.intelligence_v2.version, "2.0");
    assert.equal(result.market.intelligence_v2.status, "evaluated");
    assert.equal(result.stages.market_analysis, "completed");
    assert.equal(result.property.intelligence?.price_per_m2, 8000);
    assert.equal(result.property.intelligence?.price_per_m2_method, "price_divided_by_surface");
    assert.notEqual(result.property.intelligence?.market_position, null);
    assert.ok(result.property.intelligence?.market_reference_id);
    assert.equal(result.market.contract_validation.valid, true);
  });

  it("keeps rental market position null in the unified pipeline", () => {
    const rentRow: ValidatedFeedRow = {
      ...FEED_ROW,
      external_id: "market-v2-rent-1",
      transaction_type: "rent",
      price_mad: 8000,
    };
    const result = runStructuredListingIntelligencePipeline({
      origin: "direct_feed",
      row: rentRow,
      context: context("market-v2-rent"),
    }, NOW);

    assert.equal(result.market.intelligence_v2.reason_code, "rental_benchmark_unavailable");
    assert.equal(result.stages.market_analysis, "unavailable");
    assert.equal(result.property.intelligence?.market_position, null);
    assert.equal(result.property.intelligence?.market_reference_id, null);
  });

  it("never uses forbidden certainty wording in the public market claim", () => {
    const result = runStructuredListingIntelligencePipeline({
      origin: "direct_feed",
      row: FEED_ROW,
      context: context("market-v2-wording"),
    }, NOW);
    const text = [
      result.market.claim.label,
      result.market.claim.explanation,
      ...result.market.claim.limitations,
    ].join(" ").toLowerCase();

    for (const forbidden of [
      "prix officiel",
      "prix certifié",
      "prix vérifié",
      "prix garanti",
      "prix exact",
      "prix réel",
      "bonne affaire",
      "surcoté",
      "trop cher",
    ]) {
      assert.equal(text.includes(forbidden), false, `forbidden wording present: ${forbidden}`);
    }
  });
});
