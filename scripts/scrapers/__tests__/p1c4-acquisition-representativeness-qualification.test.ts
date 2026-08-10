import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRepresentativeness,
  hasProximityLanguageSignal,
  matchesGuelizRentCandidate,
  normalizeScopeText,
  percent,
} from "../../audits/p1c4-acquisition-representativeness-qualification";

const completeDesign = {
  exact_scope_source_universe_manifest: true,
  versioned_query_universe: true,
  per_source_depth_contract: true,
  source_inclusion_exclusion_reasons: true,
  freshness_contract: true,
  duplicate_handling_contract: true,
  known_holes_register: true,
  source_policy_snapshot: true,
  exact_scope_geo_semantics_review: true,
  live_discovery_reconciliation: true,
  evidence_sufficient_under_versioned_design: true,
};

test("P1C.4 is NOT_CERTIFIABLE when the independent denominator design is missing", () => {
  assert.equal(
    classifyRepresentativeness({ ...completeDesign, exact_scope_source_universe_manifest: false }),
    "NOT_CERTIFIABLE",
  );
  assert.equal(
    classifyRepresentativeness({ ...completeDesign, per_source_depth_contract: false }),
    "NOT_CERTIFIABLE",
  );
  assert.equal(
    classifyRepresentativeness({ ...completeDesign, exact_scope_geo_semantics_review: false }),
    "NOT_CERTIFIABLE",
  );
});

test("P1C.4 distinguishes insufficient evidence from an undefined denominator", () => {
  assert.equal(
    classifyRepresentativeness({ ...completeDesign, evidence_sufficient_under_versioned_design: false }),
    "INSUFFICIENT",
  );
});

test("P1C.4 can certify only after every versioned design gate and evidence gate passes", () => {
  assert.equal(classifyRepresentativeness(completeDesign), "CERTIFIED");
});

test("P1C.4 scope matching is accent-safe and rent-specific", () => {
  assert.equal(
    matchesGuelizRentCandidate({
      discovery_query: "location appartement Marrakech Guéliz",
      title: "Appartement à louer à Guéliz",
      snippet: "Marrakech centre",
    }),
    true,
  );
  assert.equal(
    matchesGuelizRentCandidate({
      discovery_query: "vente appartement Marrakech Guéliz",
      title: "Appartement à vendre",
      snippet: "Guéliz Marrakech",
    }),
    false,
  );
});

test("P1C.4 treats proximity wording as a contamination signal, not exact-scope proof", () => {
  assert.equal(hasProximityLanguageSignal("À 10 minutes du centre-ville (Guéliz), Marrakech"), true);
  assert.equal(hasProximityLanguageSignal("Appartement au cœur de Guéliz Marrakech"), false);
});

test("P1C.4 normalization and percentages stay deterministic", () => {
  assert.equal(normalizeScopeText("  GUÉLIZ   Marrakech  "), "gueliz marrakech");
  assert.equal(percent(3, 74), 4.05);
  assert.equal(percent(0, 0), 0);
});
