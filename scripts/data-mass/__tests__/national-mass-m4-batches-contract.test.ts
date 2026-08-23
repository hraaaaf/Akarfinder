import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("scripts/data-mass/national-mass-m4-batches.ts"), "utf8");

test("M4 batches require explicit write flag and hard-cap batch size", () => {
  assert.equal(source.includes('MASS_INDEX_M4_BATCH_WRITE !== "1"'), true);
  assert.equal(source.includes("MAX_BATCH_SIZE = 100"), true);
  assert.equal(source.includes("M4_BATCH_CERTIFIED_COHORT_DRIFT"), true);
  assert.equal(source.includes("M4_BATCH_RACE_CONFLICT"), true);
});

test("M4 batches preserve minimal index and Search-OFF invariants", () => {
  assert.equal(source.includes("M4_BATCH_METADATA_DRIFT"), true);
  assert.equal(source.includes('row.freshness_status !== "seed_only"'), true);
  assert.equal(source.includes("M4_BATCH_THIN_INDEX_LEAK"), true);
  assert.equal(source.includes("M4_BATCH_THIN_DELTA_DRIFT"), true);
  assert.equal(source.includes("publicSearchActivationChanges: 0"), true);
});

test("M4 batches compensate the full run on failure", () => {
  assert.equal(source.includes("rollbackAll(db, insertedIds)"), true);
  assert.equal(source.includes("M4_BATCH_ROLLBACK_SEED_RESIDUE"), true);
  assert.equal(source.includes("fullRunCompensatingRollbackOnFailure: true"), true);
});
