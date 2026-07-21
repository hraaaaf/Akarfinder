// OPENSERP-YANDEX-DUAL-DISCOVERY-LANE-1 -- observability addition only.
// Pure unit tests for computeCrossChannelOverlapMetrics: no DB, no
// network, no orchestrator involvement -- just set arithmetic.

import test from "node:test";
import assert from "node:assert/strict";
import { computeCrossChannelOverlapMetrics } from "../../../lib/openserp-ingestion/searxng-yandex-channel";

test("mission's own worked example: A={a,b,c}, Y={b,c,d,e} -> unique 3/4, overlap 2, incremental 2", () => {
  const openserp = new Set(["a", "b", "c"]);
  const yandex = new Set(["b", "c", "d", "e"]);
  const result = computeCrossChannelOverlapMetrics(openserp, yandex);
  assert.equal(result.openserp_unique_before_merge, 3);
  assert.equal(result.yandex_unique_before_merge, 4);
  assert.equal(result.cross_channel_overlap_exact, 2);
  assert.equal(result.yandex_incremental_unique, 2);
});

test("overlap 0: completely disjoint sets", () => {
  const openserp = new Set(["a", "b"]);
  const yandex = new Set(["c", "d"]);
  const result = computeCrossChannelOverlapMetrics(openserp, yandex);
  assert.equal(result.openserp_unique_before_merge, 2);
  assert.equal(result.yandex_unique_before_merge, 2);
  assert.equal(result.cross_channel_overlap_exact, 0);
  assert.equal(result.yandex_incremental_unique, 2);
});

test("overlap total: Yandex is a strict subset of OpenSERP (0 incremental gain)", () => {
  const openserp = new Set(["a", "b", "c", "d"]);
  const yandex = new Set(["b", "c"]);
  const result = computeCrossChannelOverlapMetrics(openserp, yandex);
  assert.equal(result.openserp_unique_before_merge, 4);
  assert.equal(result.yandex_unique_before_merge, 2);
  assert.equal(result.cross_channel_overlap_exact, 2);
  assert.equal(result.yandex_incremental_unique, 0);
});

test("empty channel: OpenSERP empty, Yandex has results -> 100% incremental", () => {
  const openserp = new Set<string>();
  const yandex = new Set(["x", "y"]);
  const result = computeCrossChannelOverlapMetrics(openserp, yandex);
  assert.equal(result.openserp_unique_before_merge, 0);
  assert.equal(result.yandex_unique_before_merge, 2);
  assert.equal(result.cross_channel_overlap_exact, 0);
  assert.equal(result.yandex_incremental_unique, 2);
});

test("empty channel: Yandex empty, OpenSERP has results -> 0 incremental, 0 overlap", () => {
  const openserp = new Set(["a", "b", "c"]);
  const yandex = new Set<string>();
  const result = computeCrossChannelOverlapMetrics(openserp, yandex);
  assert.equal(result.openserp_unique_before_merge, 3);
  assert.equal(result.yandex_unique_before_merge, 0);
  assert.equal(result.cross_channel_overlap_exact, 0);
  assert.equal(result.yandex_incremental_unique, 0);
});

test("both channels empty", () => {
  const result = computeCrossChannelOverlapMetrics(new Set<string>(), new Set<string>());
  assert.equal(result.openserp_unique_before_merge, 0);
  assert.equal(result.yandex_unique_before_merge, 0);
  assert.equal(result.cross_channel_overlap_exact, 0);
  assert.equal(result.yandex_incremental_unique, 0);
});

test("identical sets: full overlap, 0 incremental", () => {
  const openserp = new Set(["a", "b", "c"]);
  const yandex = new Set(["a", "b", "c"]);
  const result = computeCrossChannelOverlapMetrics(openserp, yandex);
  assert.equal(result.cross_channel_overlap_exact, 3);
  assert.equal(result.yandex_incremental_unique, 0);
});
