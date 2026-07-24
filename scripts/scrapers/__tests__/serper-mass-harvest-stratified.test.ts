import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStratifiedCanaryQueries,
  STRATIFIED_CANARY_ALLOCATIONS,
  STRATIFIED_CANARY_BUDGET,
} from "@/lib/serper-mass-harvest/stratified-canary";

test("stratified Serper canary emits exactly 50 unique queries with locked source allocation", () => {
  const queries = buildStratifiedCanaryQueries();
  assert.equal(queries.length, STRATIFIED_CANARY_BUDGET);
  assert.equal(STRATIFIED_CANARY_BUDGET, 50);
  assert.equal(new Set(queries.map((query) => query.query)).size, queries.length);

  for (const allocation of STRATIFIED_CANARY_ALLOCATIONS) {
    assert.equal(
      queries.filter((query) => query.source_id === allocation.source_id).length,
      allocation.count,
      allocation.source_id,
    );
  }
});

test("stratified Serper canary includes both source-targeted and long-tail discovery queries", () => {
  const queries = buildStratifiedCanaryQueries();
  assert.ok(queries.some((query) => query.source_id === "mubawab"));
  assert.ok(queries.some((query) => query.source_id === "avito"));
  assert.ok(queries.some((query) => query.source_id === "sarouty"));
  assert.equal(queries.filter((query) => query.source_id === "long_tail").length, 4);
  assert.ok(queries.filter((query) => query.source_id === "long_tail").every((query) => query.phase === "discovery"));
});
