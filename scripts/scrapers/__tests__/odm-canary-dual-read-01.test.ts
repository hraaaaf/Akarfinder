import assert from "node:assert/strict";
import test from "node:test";

import {
  compareLegacyAndOdm,
  readDualReadSamplePercent,
  shouldRunOdmDualRead,
} from "../../../lib/odm/odm-dual-read-shadow";

const baseLegacy = {
  listings: [
    { id: "legacy-1", listing_url: "https://example.ma/a?utm_source=test#details", price: 1_000_000, surface_m2: 100 },
    { id: "legacy-2", canonical_url: "https://example.ma/b/", price: 2_000_000, surface: 200 },
  ],
  total: 2,
  limit: 50,
  offset: 0,
  next_cursor: null,
  has_more: false,
  source: "database",
  generated_at: "2026-07-28T00:00:00.000Z",
} as never;

const baseOdm = {
  results: [
    { id: "odm-1", original_url: "https://example.ma/a", normalized_price_mad: 1_000_000, normalized_surface_m2: 100 },
    { id: "odm-2", original_url: "https://example.ma/c", price: 3_000_000, surface: 300 },
  ],
  results_count: 2,
  total_count: 2,
  has_more: false,
  next_cursor: null,
} as never;

test("dual read is disabled unless both explicit flag and bounded sample are present", () => {
  assert.equal(shouldRunOdmDualRead("key", {}), false);
  assert.equal(shouldRunOdmDualRead("key", { ODM_DUAL_READ_ENABLED: "true" }), false);
  assert.equal(readDualReadSamplePercent({ ODM_DUAL_READ_SAMPLE_PERCENT: "6" }), 0);
  assert.equal(readDualReadSamplePercent({ ODM_DUAL_READ_SAMPLE_PERCENT: "5" }), 5);
});

test("dual read sampling is deterministic", () => {
  const env = { ODM_DUAL_READ_ENABLED: "true", ODM_DUAL_READ_SAMPLE_PERCENT: "5" };
  assert.equal(shouldRunOdmDualRead("same-key", env), shouldRunOdmDualRead("same-key", env));
});

test("comparison recognizes listing_url and records raw/comparable counts", () => {
  const metric = compareLegacyAndOdm("stable-key", baseLegacy, baseOdm, new Date("2026-07-28T00:00:00.000Z"));
  assert.equal(metric.legacy_result_count, 2);
  assert.equal(metric.legacy_comparable_count, 2);
  assert.equal(metric.legacy_missing_identity_count, 0);
  assert.equal(metric.odm_result_count, 2);
  assert.equal(metric.odm_comparable_count, 2);
  assert.equal(metric.odm_missing_identity_count, 0);
  assert.equal(metric.legacy_count, metric.legacy_comparable_count);
  assert.equal(metric.odm_count, metric.odm_comparable_count);
  assert.equal(metric.canonical_overlap_count, 1);
  assert.equal(metric.canonical_overlap_rate, 0.5);
  assert.equal(metric.rank_overlap_at_10, 1);
  assert.equal(metric.trusted_price_comparisons, 1);
  assert.equal(metric.trusted_surface_comparisons, 1);
});

test("comparison distinguishes empty engines from missing identities", () => {
  const legacy = { ...baseLegacy, listings: [{ id: "legacy-no-url", price: 500_000 }] } as never;
  const odm = { ...baseOdm, results: [{ id: "odm-no-url" }], results_count: 1, total_count: 1 } as never;
  const metric = compareLegacyAndOdm("missing-identities", legacy, odm);
  assert.equal(metric.legacy_result_count, 1);
  assert.equal(metric.legacy_comparable_count, 0);
  assert.equal(metric.legacy_missing_identity_count, 1);
  assert.equal(metric.odm_result_count, 1);
  assert.equal(metric.odm_comparable_count, 0);
  assert.equal(metric.odm_missing_identity_count, 1);
});

test("comparison flags material price and surface differences above two percent", () => {
  const divergentOdm = {
    ...baseOdm,
    results: [{ id: "odm-1", original_url: "https://example.ma/a", price: 900_000, surface: 90 }],
    results_count: 1,
    total_count: 1,
  } as never;
  const metric = compareLegacyAndOdm("stable-key", baseLegacy, divergentOdm);
  assert.equal(metric.trusted_price_divergences, 1);
  assert.equal(metric.trusted_surface_divergences, 1);
});
