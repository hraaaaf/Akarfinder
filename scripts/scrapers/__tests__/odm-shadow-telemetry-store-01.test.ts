import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  runOdmDualReadShadow,
  type OdmDualReadRunnerDependencies,
} from "../../../lib/odm/odm-dual-read-runner";
import {
  metricToTelemetryRow,
  persistOdmDualReadMetric,
} from "../../../lib/odm/odm-shadow-telemetry-store";
import type { OdmDualReadDivergence } from "../../../lib/odm/odm-dual-read-shadow";
import type { SearchResult } from "../../../lib/search";
import type { PublicSearchPage } from "../../../lib/search-gateway/public-search-cursor";

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

const legacyResult = { listings: [] } as unknown as SearchResult;
const odmPage: PublicSearchPage = {
  results: [],
  results_count: 0,
  total_count: 0,
  has_more: false,
  next_cursor: null,
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

test("shadow runner completes RPC, comparison and telemetry persistence in order", async () => {
  const events: string[] = [];
  const dependencies: OdmDualReadRunnerDependencies = {
    async search() {
      events.push("search");
      return odmPage;
    },
    compare() {
      events.push("compare");
      return metric;
    },
    emit() {
      events.push("emit");
    },
    async persist() {
      events.push("persist");
      return { stored: true };
    },
    logStage(event) {
      events.push(event);
    },
    logError() {
      events.push("error");
    },
  };

  const result = await runOdmDualReadShadow({
    stableKey: "private raw stable key",
    legacyResult,
    odmInput: { q: "villa casablanca", limit: 50 },
  }, dependencies);

  assert.deepEqual(result, { completed: true, write: { stored: true } });
  assert.deepEqual(events, [
    "odm_rpc_started",
    "search",
    "odm_rpc_completed",
    "compare",
    "comparison_completed",
    "emit",
    "telemetry_write_started",
    "persist",
    "telemetry_write_completed",
  ]);
});

test("shadow runner reports the exact failing stage without exposing the stable key", async () => {
  const errors: Record<string, unknown>[] = [];
  let persisted = false;
  const dependencies: OdmDualReadRunnerDependencies = {
    async search() {
      return odmPage;
    },
    compare() {
      throw new Error("comparison_boom");
    },
    emit() {},
    async persist() {
      persisted = true;
      return { stored: true };
    },
    logStage() {},
    logError(payload) {
      errors.push(payload);
    },
  };

  const result = await runOdmDualReadShadow({
    stableKey: "private raw stable key",
    legacyResult,
    odmInput: { q: "villa casablanca", limit: 50 },
  }, dependencies);

  assert.deepEqual(result, {
    completed: false,
    stage: "comparison",
    error: "comparison_boom",
  });
  assert.equal(persisted, false);
  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.stage, "comparison");
  assert.equal(JSON.stringify(errors).includes("private raw stable key"), false);
  assert.equal(JSON.stringify(errors).includes("villa casablanca"), false);
});

test("search route reserves runtime headroom and delegates shadow execution", async () => {
  const routeSource = await readFile(
    new URL("../../../app/api/search/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /export const maxDuration = 60;/);
  assert.match(routeSource, /runOdmDualReadShadow/);
  assert.match(routeSource, /after\(async \(\) =>/);
  assert.doesNotMatch(routeSource, /persistOdmDualReadMetric/);
});
