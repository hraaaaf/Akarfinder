import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateAnomalyEngineV1 } from "../../../lib/intelligence/anomaly-engine-v1.js";
import { evaluateMarketIntelligenceV2 } from "../../../lib/market/market-intelligence-v2.js";
import { adaptValidatedFeedRow } from "../../../lib/property-schema/adapters.js";
import { fact, type CanonicalPropertyV1 } from "../../../lib/property-schema/core.js";
import type { ValidatedFeedRow } from "../../../lib/feeds/schema.js";

const NOW = "2026-07-21T19:00:00.000Z";

function feedRow(overrides: Partial<ValidatedFeedRow> = {}): ValidatedFeedRow {
  return {
    external_id: "feed-anomaly-1",
    source_name: "Agency Feed",
    source_domain: "agency.example.ma",
    source_url: "https://agency.example.ma/listings/1",
    transaction_type: "sale",
    property_type: "apartment",
    title: "Appartement Maârif",
    description: "Appartement structuré.",
    city: "Casablanca",
    district: "Maârif",
    price_mad: 800000,
    surface_m2: 100,
    bedrooms_count: 2,
    coordinates: null,
    image_urls: [],
    updated_at_source: NOW,
    update_signal: null,
    ...overrides,
  };
}

function property(overrides: Partial<ValidatedFeedRow> = {}): CanonicalPropertyV1 {
  const row = feedRow(overrides);
  const result = adaptValidatedFeedRow(row, {
    property_id: "property-anomaly",
    offer_id: "offer-anomaly",
    source_id: "source-agency",
    source_name: "Agency Feed",
    external_offer_id: row.external_id,
    source_url: row.source_url,
    compliance_status: "allowed",
    now: NOW,
  });
  result.offers[0].first_observed_at = NOW;
  result.offers[0].last_observed_at = NOW;
  return result;
}

function marketFor(p: CanonicalPropertyV1) {
  const offer = p.offers[0];
  return evaluateMarketIntelligenceV2({
    city: p.facts.location.city.value,
    neighborhood: p.facts.location.district?.value ?? null,
    property_type: p.facts.classification.property_type.value,
    transaction_type: offer.transaction_type,
    market_segment: p.facts.classification.market_segment.value,
    surface_m2: p.facts.surfaces.surface_total_m2?.value ?? null,
    asking_price_mad: offer.price_amount.value,
    generated_at: NOW,
  });
}

function evaluate(p: CanonicalPropertyV1, context: Parameters<typeof evaluateAnomalyEngineV1>[4] = {}) {
  return evaluateAnomalyEngineV1(p, p.offers[0] ?? null, marketFor(p), NOW, context);
}

describe("#15 anomaly engine v1", () => {
  it("returns zero intensity when evaluable checks trigger no anomaly and never claims universal correctness", () => {
    const result = evaluate(property());
    assert.equal(result.version, "1.0");
    assert.equal(result.status, "evaluated");
    assert.equal(result.anomaly_score, 0);
    assert.equal(result.signals.length, 0);
    assert.equal(result.claim.strength, "unavailable");
    assert.equal(result.contract_validation.valid, true);
    assert.match(result.claim.explanation, /ne démontre pas/i);
  });

  it("flags an extreme market price gap only when Market Intelligence V2 is evaluated", () => {
    const p = property({ price_mad: 2500000 });
    const result = evaluate(p);
    const signal = result.signals.find((item) => item.code === "market_price_outlier");
    assert.ok(signal);
    assert.ok(Number(signal?.metrics.gap_percent) > 50);
    assert.notEqual(result.anomaly_score, null);
    assert.equal(result.contract_validation.valid, true);
  });

  it("does not use an unavailable market comparison as an anomaly", () => {
    const p = property({ transaction_type: "rent", price_mad: 8000 });
    const result = evaluate(p);
    assert.equal(result.signals.some((item) => item.code === "market_price_outlier"), false);
    assert.ok(result.coverage.unavailable_checks.includes("market_price_outlier"));
  });

  it("flags an inverted declared price range without deciding which value is correct", () => {
    const p = property();
    p.offers[0].price_range_min = fact(1200000, { source_ref: p.offers[0].source_url });
    p.offers[0].price_range_max = fact(900000, { source_ref: p.offers[0].source_url });
    const result = evaluate(p);
    const signal = result.signals.find((item) => item.code === "price_range_order_conflict");
    assert.ok(signal);
    assert.equal(signal?.severity, "high");
    assert.match(signal?.limitations[0] ?? "", /ne permet pas de déterminer/i);
  });

  it("flags impossible observation chronology and future timestamps", () => {
    const p = property();
    p.offers[0].first_observed_at = "2026-07-25T12:00:00.000Z";
    p.offers[0].last_observed_at = "2026-07-20T12:00:00.000Z";
    const result = evaluate(p);
    assert.equal(result.signals.some((item) => item.code === "observation_chronology_conflict"), true);
    assert.equal(result.signals.some((item) => item.code === "future_observation_timestamp"), true);
  });

  it("flags active offers whose availability state says sold/rented/withdrawn", () => {
    const p = property();
    p.offers[0].offer_status = "active";
    p.offers[0].availability_status = "sold";
    const result = evaluate(p);
    const signal = result.signals.find((item) => item.code === "offer_lifecycle_conflict");
    assert.ok(signal);
    assert.equal(signal?.confidence, "high");
  });

  it("flags only conservative unit-like surface divergences", () => {
    const p = property();
    p.facts.surfaces.surface_total_m2 = fact(100, { source_ref: "declared" });
    p.facts.surfaces.surface_habitable_m2 = fact(160, { source_ref: "declared" });
    const result = evaluate(p);
    assert.equal(result.signals.some((item) => item.code === "surface_fact_divergence"), true);

    const villa = property({ property_type: "villa" });
    villa.facts.surfaces.surface_total_m2 = fact(100, { source_ref: "declared" });
    villa.facts.surfaces.surface_habitable_m2 = fact(160, { source_ref: "declared" });
    const villaResult = evaluate(villa);
    assert.equal(villaResult.signals.some((item) => item.code === "surface_fact_divergence"), false);
  });

  it("flags large price divergence only across offers already attached to the same canonical property", () => {
    const p = property();
    const second = {
      ...p.offers[0],
      offer_id: "offer-anomaly-2",
      source_id: "source-other",
      source_name: "Other Agency",
      external_offer_id: "other-2",
      source_url: "https://other.example.ma/2",
      canonical_source_url: "https://other.example.ma/2",
      price_amount: fact(1800000, { source_ref: "https://other.example.ma/2" }),
    };
    p.offers = [p.offers[0], second];
    const result = evaluate(p);
    const signal = result.signals.find((item) => item.code === "multi_offer_price_divergence");
    assert.ok(signal);
    assert.ok(Number(signal?.metrics.divergence_percent) >= 40);
    assert.match(signal?.limitations[0] ?? "", /rattachement canonique/i);
  });

  it("never invents price history but detects an abrupt change when real history is explicitly supplied", () => {
    const p = property();
    const withoutHistory = evaluate(p);
    assert.equal(withoutHistory.signals.some((item) => item.code === "abrupt_price_change"), false);
    assert.ok(withoutHistory.coverage.unavailable_checks.includes("abrupt_price_change"));

    const withHistory = evaluate(p, {
      price_history: [
        { observed_at: "2026-07-01T10:00:00.000Z", price_mad: 800000, source_ref: "source-a" },
        { observed_at: "2026-07-10T10:00:00.000Z", price_mad: 1200000, source_ref: "source-a" },
      ],
    });
    const signal = withHistory.signals.find((item) => item.code === "abrupt_price_change");
    assert.ok(signal);
    assert.equal(signal?.metrics.change_percent, 50);
  });

  it("keeps public anomaly wording non-accusatory", () => {
    const p = property({ price_mad: 2500000 });
    const result = evaluate(p);
    const text = [
      result.claim.label,
      result.claim.explanation,
      ...result.claim.limitations,
      ...result.signals.flatMap((signal) => [signal.label, signal.explanation, ...signal.limitations]),
    ].join(" ").toLowerCase();
    for (const forbidden of ["fraude", "arnaque", "mensonge", "faux prix", "doublon certain"]) {
      assert.equal(text.includes(forbidden), false, `forbidden accusatory wording present: ${forbidden}`);
    }
    assert.equal(result.contract_validation.valid, true);
  });
});
