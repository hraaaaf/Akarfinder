import assert from "node:assert/strict";
import test from "node:test";

import { assessOdmDivergence, summarizeOdmDivergences } from "../../../lib/odm/odm-divergence-analyzer";
import type { OdmDualReadDivergence } from "../../../lib/odm/odm-dual-read-shadow";

function metric(overrides: Partial<OdmDualReadDivergence> = {}): OdmDualReadDivergence {
  return {
    version: "odm_dual_read_v1",
    stable_key_hash: "abc123",
    legacy_result_count: 10,
    legacy_comparable_count: 10,
    legacy_missing_identity_count: 0,
    odm_result_count: 10,
    odm_comparable_count: 10,
    odm_missing_identity_count: 0,
    legacy_count: 10,
    odm_count: 10,
    canonical_overlap_count: 9,
    canonical_overlap_rate: 0.9,
    rank_overlap_at_10: 8,
    trusted_price_comparisons: 10,
    trusted_price_divergences: 0,
    trusted_surface_comparisons: 10,
    trusted_surface_divergences: 0,
    generated_at: "2026-07-28T00:00:00.000Z",
    ...overrides,
  };
}

test("classifies equivalent healthy samples", () => {
  const result = assessOdmDivergence(metric());
  assert.equal(result.verdict, "equivalent");
  assert.equal(result.severity, "low");
});

test("classifies trusted price regressions as blocking", () => {
  const result = assessOdmDivergence(metric({ trusted_price_divergences: 2 }));
  assert.equal(result.verdict, "odm_regression");
  assert.equal(result.primary_cause, "trusted_price");
  assert.equal(result.severity, "high");
});

test("recognizes conservative ODM coverage gains", () => {
  const result = assessOdmDivergence(metric({ legacy_count: 10, odm_count: 15, canonical_overlap_rate: 0.7 }));
  assert.equal(result.verdict, "odm_better");
  assert.equal(result.primary_cause, "coverage");
});

test("summary remains stopped below 200 events", () => {
  const result = summarizeOdmDivergences(Array.from({ length: 199 }, () => metric()));
  assert.equal(result.stop_public_canary, true);
  assert.deepEqual(result.stop_reasons, ["insufficient_sample"]);
});

test("summary clears stop gate for 200 healthy events", () => {
  const result = summarizeOdmDivergences(Array.from({ length: 200 }, () => metric()));
  assert.equal(result.stop_public_canary, false);
  assert.equal(result.sample_size, 200);
  assert.equal(result.verdict_counts.equivalent, 200);
});

test("summary stops when trusted surface divergence exceeds 3 percent", () => {
  const events = Array.from({ length: 200 }, (_, index) => metric({
    trusted_surface_comparisons: 1,
    trusted_surface_divergences: index < 7 ? 1 : 0,
  }));
  const result = summarizeOdmDivergences(events);
  assert.equal(result.stop_public_canary, true);
  assert.ok(result.stop_reasons.includes("trusted_surface_divergence_exceeded"));
});
