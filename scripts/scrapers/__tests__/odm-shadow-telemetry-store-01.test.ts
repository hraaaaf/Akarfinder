import assert from "node:assert/strict";
import test from "node:test";

import {
  metricToTelemetryRow,
  persistOdmDualReadMetric,
} from "../../../lib/odm/odm-shadow-telemetry-store";
import type { OdmDualReadDivergence } from "../../../lib/odm/odm-dual-read-shadow";

const metric: OdmDualReadDivergence = {
  version: "odm_dual_read_v1",
  stable_key_hash: "0123456789abcdef",
  legacy_count: 10,
  odm_count: 11,
  canonical_overlap_count: 8,
  canonical_overlap_rate: 0.8,
  rank_overlap_at_10: 7,
  trusted_price_comparisons: 8,
  trusted_price_divergences: 0,
  trusted_surface_comparisons: 7,
  trusted_surface_divergences: 0,
  generated_at: "2026-07-28T18:30:00.000Z",
};

test("telemetry row contains only approved aggregate fields", () => {
  const row = metricToTelemetryRow(metric);
  assert.deepEqual(Object.keys(row).sort(), [
    "canonical_overlap_count",
    "canonical_overlap_rate",
    "legacy_count",
    "metric_generated_at",
    "odm_count",
    "rank_overlap_at_10",
    "stable_key_hash",
    "trusted_price_comparisons",
    "trusted_price_divergences",
    "trusted_surface_comparisons",
    "trusted_surface_divergences",
    "version",
  ].sort());
  assert.equal("query" in row, false);
  assert.equal("user_id" in row, false);
  assert.equal("ip" in row, false);
});

test("missing server credentials disables persistence without throwing", async () => {
  const result = await persistOdmDualReadMetric(metric, {});
  assert.deepEqual(result, { stored: false, reason: "missing_configuration" });
});
