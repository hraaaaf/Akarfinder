import assert from "node:assert/strict";
import test from "node:test";
import { classifySourceUniverse } from "../../audits/p1c4a-acquisition-source-universe";

const proven = {
  universe_versioned: true,
  scope_exact: true,
  source_list_frozen_before_numerator: true,
  observed_sources_used_to_define_universe: false,
  baseline_source_count: 12,
  baseline_registry_missing_count: 0,
  challenger_outside_baseline_count: 0,
  unresolved_registry_scope_count: 0,
  per_source_inventory_depth_unproven_count: 0,
  per_source_freshness_unproven_count: 0,
  exact_scope_identifiability_unproven_count: 0,
  channels_unreconciled_count: 0,
};

test("P1C.4A proves a source universe only after every denominator gate is satisfied", () => {
  assert.equal(classifySourceUniverse(proven), "PROVEN");
});

test("P1C.4A rejects circular or numerator-first denominator construction", () => {
  assert.equal(
    classifySourceUniverse({ ...proven, observed_sources_used_to_define_universe: true }),
    "INVALID",
  );
  assert.equal(
    classifySourceUniverse({ ...proven, source_list_frozen_before_numerator: false }),
    "INVALID",
  );
});

test("P1C.4A rejects missing version, scope or baseline registry rows", () => {
  assert.equal(classifySourceUniverse({ ...proven, universe_versioned: false }), "INVALID");
  assert.equal(classifySourceUniverse({ ...proven, scope_exact: false }), "INVALID");
  assert.equal(classifySourceUniverse({ ...proven, baseline_source_count: 0 }), "INVALID");
  assert.equal(classifySourceUniverse({ ...proven, baseline_registry_missing_count: 1 }), "INVALID");
});

test("P1C.4A keeps a versioned design fail-closed when challenger or registry scope holes remain", () => {
  assert.equal(
    classifySourceUniverse({ ...proven, challenger_outside_baseline_count: 1 }),
    "DESIGNED_NOT_PROVEN",
  );
  assert.equal(
    classifySourceUniverse({ ...proven, unresolved_registry_scope_count: 1 }),
    "DESIGNED_NOT_PROVEN",
  );
});

test("P1C.4A never treats missing source inventory depth/freshness as a proven denominator", () => {
  assert.equal(
    classifySourceUniverse({ ...proven, per_source_inventory_depth_unproven_count: 1 }),
    "DESIGNED_NOT_PROVEN",
  );
  assert.equal(
    classifySourceUniverse({ ...proven, per_source_freshness_unproven_count: 1 }),
    "DESIGNED_NOT_PROVEN",
  );
});

test("P1C.4A requires exact-scope identifiability and channel reconciliation per source", () => {
  assert.equal(
    classifySourceUniverse({ ...proven, exact_scope_identifiability_unproven_count: 1 }),
    "DESIGNED_NOT_PROVEN",
  );
  assert.equal(
    classifySourceUniverse({ ...proven, channels_unreconciled_count: 1 }),
    "DESIGNED_NOT_PROVEN",
  );
});
