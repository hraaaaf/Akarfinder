import assert from "node:assert/strict";
import test from "node:test";
import {
  BULK_HARVEST_BUDGET,
  BULK_SOURCE_ALLOCATIONS,
  buildBulkHarvestQueries,
} from "@/lib/serper-mass-harvest/bulk-plan";

test("bulk Serper plan allocates exactly 1900 unique queries", () => {
  const queries = buildBulkHarvestQueries();
  assert.equal(queries.length, BULK_HARVEST_BUDGET);
  assert.equal(BULK_HARVEST_BUDGET, 1900);
  assert.equal(new Set(queries.map((query) => query.query)).size, 1900);
});

test("bulk Serper plan matches measured source allocation", () => {
  const queries = buildBulkHarvestQueries();
  for (const allocation of BULK_SOURCE_ALLOCATIONS) {
    assert.equal(
      queries.filter((query) => query.source_id === allocation.source_id).length,
      allocation.count,
      allocation.source_id,
    );
  }
  assert.equal(BULK_SOURCE_ALLOCATIONS.reduce((sum, item) => sum + item.count, 0), 1900);
});

test("bulk plan excludes low-yield Avito and Sarouty templates", () => {
  const queries = buildBulkHarvestQueries();
  assert.equal(queries.some((query) => query.source_id === "avito"), false);
  assert.equal(queries.some((query) => query.source_id === "sarouty"), false);
});
