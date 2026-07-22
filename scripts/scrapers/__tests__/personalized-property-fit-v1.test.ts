import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findNeighborhoodV2 } from "../../../lib/neighborhood-intelligence/build-v2-from-v1.js";
import { computePropertyFit, type FitPropertyInput } from "../../../lib/property-fit-v1/property-fit-engine.js";
import { rankCandidatesByPersonalFit } from "../../../lib/property-fit-v1/personalized-ranking.js";
import { applySearchProfileEvent } from "../../../lib/search-profile-v2/profile-engine.js";
import { createEmptyDynamicSearchProfileV2 } from "../../../lib/search-profile-v2/types.js";

const PROPERTY: FitPropertyInput = {
  id: "p1", city: "Casablanca", neighborhood: "Ain Diab", property_type: "apartment",
  price_mad: 1_600_000, surface_m2: 100, bedrooms: 3, features: { parking: true, elevator: true },
};

function neighborhoodWithScores() {
  const n = structuredClone(findNeighborhoodV2("Casablanca", "Ain Diab"));
  assert.ok(n);
  const evidence = (value: number) => ({ value, evidence_kind: "derived_score" as const, confidence: "high" as const, source_refs: ["test-evidence"], observed_at: "2026-07-22", method_version: "test-fixture" });
  n.akar_scores.family_fit = evidence(9);
  n.akar_scores.calmness = evidence(7);
  n.akar_scores.short_term_rental_fit = evidence(3);
  n.akar_scores.tourism_intensity = evidence(8);
  return n;
}

describe("#19E Personalized Property Fit & Ranking V1", () => {
  it("produces different Fit for the same property depending on the search project", () => {
    let family = createEmptyDynamicSearchProfileV2();
    family = applySearchProfileEvent(family, { type: "preference", key: "family_fit", direction: "prefer_high", importance: "high" });
    let investor = createEmptyDynamicSearchProfileV2();
    investor = applySearchProfileEvent(investor, { type: "preference", key: "short_term_rental_fit", direction: "prefer_high", importance: "high" });
    const n = neighborhoodWithScores();
    const familyFit = computePropertyFit(family, PROPERTY, n);
    const investorFit = computePropertyFit(investor, PROPERTY, n);
    assert.ok((familyFit.score ?? 0) > (investorFit.score ?? 100));
  });

  it("treats missing neighborhood evidence as unavailable, never zero", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "preference", key: "walkability", direction: "prefer_high", importance: "high" });
    const fit = computePropertyFit(profile, PROPERTY, findNeighborhoodV2("Casablanca", "Ain Diab"));
    assert.equal(fit.score, null);
    assert.equal(fit.coverage, 0);
    assert.ok(fit.unavailable.includes("neighborhood:walkability"));
  });

  it("separates hard mismatches from compromises", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "objective", value: "buy" });
    profile = applySearchProfileEvent(profile, { type: "budget", purchase_max_mad: 1_000_000 });
    const fit = computePropertyFit(profile, PROPERTY, neighborhoodWithScores());
    assert.equal(fit.eligible, false);
    assert.ok(fit.hard_mismatches.some((reason) => reason.includes("Budget")));
  });

  it("personalized ranking keeps baseline relevance as stable fallback", () => {
    const profile = createEmptyDynamicSearchProfileV2();
    const ranked = rankCandidatesByPersonalFit(profile, [
      { item: "first", property: { ...PROPERTY, id: "1" }, neighborhood: null, baseline_index: 0 },
      { item: "second", property: { ...PROPERTY, id: "2" }, neighborhood: null, baseline_index: 1 },
    ]);
    assert.deepEqual(ranked.map((item) => item.item), ["first", "second"]);
  });

  it("ignores AkarScore, completeness and commercial tier metadata when computing Fit", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "preference", key: "family_fit", direction: "prefer_high", importance: "high" });
    const neighborhood = neighborhoodWithScores();
    const baseline = computePropertyFit(profile, PROPERTY, neighborhood);
    const decoratedProperty = {
      ...PROPERTY,
      akar_score: 100,
      completeness_score: 100,
      commercial_tier: "premium",
      partner_badge: "premium",
    } as FitPropertyInput;
    const decorated = computePropertyFit(profile, decoratedProperty, neighborhood);
    assert.equal(decorated.score, baseline.score);
    assert.equal(decorated.eligible, baseline.eligible);
    assert.deepEqual(decorated.components, baseline.components);
  });

  it("can eliminate must-level neighborhood mismatch when evidence exists", () => {
    let profile = createEmptyDynamicSearchProfileV2();
    profile = applySearchProfileEvent(profile, { type: "preference", key: "short_term_rental_fit", direction: "prefer_high", importance: "must" });
    const fit = computePropertyFit(profile, PROPERTY, neighborhoodWithScores());
    assert.equal(fit.eligible, false);
    assert.ok(fit.hard_mismatches.some((reason) => reason.includes("short_term_rental_fit")));
  });
});
