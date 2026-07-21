import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateAkarScoreV2 } from "../../../lib/intelligence/akar-score-v2.js";
import { runStructuredListingIntelligencePipeline } from "../../../lib/intelligence/structured-listing-pipeline.js";
import type { ValidatedFeedRow } from "../../../lib/feeds/schema.js";

const NOW = "2026-07-21T21:00:00.000Z";

const ROW: ValidatedFeedRow = {
  external_id: "akar-score-demo-1",
  source_name: "Agency Feed",
  source_domain: "agency.example.ma",
  source_url: "https://agency.example.ma/listings/akar-score-demo-1",
  transaction_type: "sale",
  property_type: "apartment",
  title: "Appartement Maârif documenté",
  description: "Appartement structuré avec plusieurs informations utiles.",
  city: "Casablanca",
  district: "Maârif",
  price_mad: 1_000_000,
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

function baseResult(id = "base") {
  return runStructuredListingIntelligencePipeline(
    { origin: "direct_feed", row: ROW, context: context(id) },
    NOW,
  );
}

function component(score: ReturnType<typeof evaluateAkarScoreV2>, key: string) {
  const found = score.components.find((item) => item.key === key);
  assert.ok(found, `missing component ${key}`);
  return found;
}

describe("#17 AkarScore V2", () => {
  it("produces an explainable documentation-quality score and wires it into the canonical pipeline", () => {
    const result = baseResult("pipeline");

    assert.equal(result.akar_score.version, "2.0");
    assert.equal(result.akar_score.status, "evaluated");
    assert.equal(result.akar_score.measured_as, "information_documentation_quality");
    assert.equal(result.akar_score.contract_validation.valid, true);
    assert.ok(result.akar_score.score != null);
    assert.ok(result.akar_score.score >= 0 && result.akar_score.score <= 100);
    assert.equal(result.property.intelligence?.akar_score, result.akar_score.score);
    assert.equal(result.stages.akar_score, "completed");
    assert.equal(result.akar_score.components.length, 5);
  });

  it("never converts an unavailable dimension into zero and re-normalizes only over available weight", () => {
    const row = { ...ROW, price_mad: null, surface_m2: null };
    const result = runStructuredListingIntelligencePipeline(
      { origin: "direct_feed", row, context: context("missing-market") },
      NOW,
    );

    const market = component(result.akar_score, "market_context_quality");
    assert.equal(market.status, "unavailable");
    assert.equal(market.score, null);
    assert.equal(market.normalized_weight, null);
    assert.equal(market.contribution, null);
    assert.equal(result.akar_score.status, "evaluated");
    assert.ok(result.akar_score.coverage.available_weight < 100);

    const normalizedAvailableWeight = result.akar_score.components
      .filter((item) => item.normalized_weight != null)
      .reduce((sum, item) => sum + Number(item.normalized_weight), 0);
    assert.ok(Math.abs(normalizedAvailableWeight - 100) <= 0.2);
  });

  it("returns insufficient_data when too few defensible dimensions are available", () => {
    const result = baseResult("minimum-coverage");
    const score = evaluateAkarScoreV2({
      property: result.property,
      selected_offer: result.selected_offer,
      completeness: result.completeness,
      freshness: {
        ...result.freshness,
        freshness_score: null,
        verification_channel: "system_unknown",
      },
      market: {
        ...result.market.intelligence_v2,
        status: "insufficient_data",
        confidence: "insufficient",
      },
      anomaly: {
        ...result.anomaly,
        status: "insufficient_data",
        anomaly_score: null,
      },
      multisource: result.multisource,
      generated_at: NOW,
    });

    assert.equal(score.coverage.minimum_coverage_met, false);
    assert.equal(score.status, "insufficient_data");
    assert.equal(score.score, null);
    assert.equal(score.claim.strength, "unavailable");
    assert.equal(score.contract_validation.valid, true);
  });

  it("lets anomaly intensity reduce only the coherence component", () => {
    const result = baseResult("anomaly-isolation");
    const normal = result.akar_score;
    const stressed = evaluateAkarScoreV2({
      property: result.property,
      selected_offer: result.selected_offer,
      completeness: result.completeness,
      freshness: result.freshness,
      market: result.market.intelligence_v2,
      anomaly: { ...result.anomaly, status: "evaluated", anomaly_score: 50 },
      multisource: result.multisource,
      generated_at: NOW,
    });

    assert.equal(component(stressed, "data_coherence").score, 50);
    for (const key of ["completeness", "provenance_traceability", "freshness", "market_context_quality"]) {
      assert.equal(component(stressed, key).score, component(normal, key).score);
    }
    assert.ok(Number(stressed.score) < Number(normal.score));
  });

  it("does not penalize single-source listings and caps corroboration to a small positive bonus", () => {
    const result = baseResult("multisource-bonus");
    const singleSource = result.akar_score;
    const corroborated = evaluateAkarScoreV2({
      property: result.property,
      selected_offer: result.selected_offer,
      completeness: result.completeness,
      freshness: result.freshness,
      market: result.market.intelligence_v2,
      anomaly: result.anomaly,
      multisource: {
        ...result.multisource,
        status: "evaluated",
        offer_count: 2,
        active_offer_count: 2,
        source_count: 2,
        is_multi_source: true,
        linkage: {
          ...result.multisource.linkage,
          level: "strong_candidate",
          confidence: "medium",
          confidence_score: 75,
          association_evidence_count: 1,
          strong_component_coverage: 1,
          contradictions_present: false,
        },
      },
      generated_at: NOW,
    });

    assert.equal(singleSource.bonus.multi_source_corroboration, 0);
    assert.equal(corroborated.bonus.multi_source_corroboration, 2);
    assert.equal(corroborated.base_score, singleSource.base_score);
    assert.ok(Number(corroborated.score) >= Number(singleSource.score));
    assert.ok(Number(corroborated.score) - Number(singleSource.score) <= 2);
  });

  it("keeps public semantics about documentation quality, never certification or truth", () => {
    const score = baseResult("wording").akar_score;
    const text = [
      score.public_label,
      score.claim.label,
      score.claim.explanation,
      ...score.claim.assumptions,
      ...score.claim.limitations,
    ].join(" ").toLowerCase();

    assert.equal(score.contract_validation.valid, true);
    assert.equal(text.includes("certifié"), false);
    assert.equal(text.includes("certifie"), false);
    assert.equal(text.includes("garanti"), false);
    assert.equal(text.includes("sans risque"), false);
    assert.equal(text.includes("preuve de vérité"), false);
    assert.match(text, /document/);
  });
});
