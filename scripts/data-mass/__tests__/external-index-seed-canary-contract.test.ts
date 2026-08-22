import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const canaryPath = new URL("../external-index-seed-canary.ts", import.meta.url);

test("M2 canary is explicit, conflict-safe and rolls back only inserted seed ids", async () => {
  const source = await readFile(canaryPath, "utf8");
  assert.ok(source.includes('MASS_INDEX_CANARY_WRITE !== "1"'));
  assert.ok(source.includes('MASS_INDEX_M2_CANARY_RACE_CONFLICT'));
  assert.ok(source.includes('.insert(plan.canary.map((row) => row.seed))'));
  assert.ok(source.includes('.in("id", inserted.map((row) => row.id))'));
  assert.ok(source.includes('vertical_classification !== "real_estate_likely"'));
  assert.ok(source.includes('document_kind !== "LISTING"'));
  assert.ok(!source.includes("upsert("));
});
