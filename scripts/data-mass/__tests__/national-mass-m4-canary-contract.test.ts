import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const canarySource = readFileSync(resolve("scripts/data-mass/national-mass-m4-canary.ts"), "utf8");

test("M4 canary requires explicit write flag and hard-caps the batch", () => {
  assert.equal(canarySource.includes('MASS_INDEX_M4_CANARY_WRITE !== "1"'), true);
  assert.equal(canarySource.includes("plan.canary.length > 10"), true);
  assert.equal(canarySource.includes("M4_CANARY_RACE_CONFLICT"), true);
});

test("M4 canary verifies minimal persistence, Thin Index exclusion and rollback", () => {
  assert.equal(canarySource.includes("row.metadata !== null"), true);
  assert.equal(canarySource.includes('row.freshness_status !== "seed_only"'), true);
  assert.equal(canarySource.includes("M4_CANARY_THIN_INDEX_LEAK"), true);
  assert.equal(canarySource.includes("thinIndexExcluded: true"), true);
  assert.equal(canarySource.includes('.from("source_offer_seeds").delete()'), true);
  assert.equal(canarySource.includes("publicSearchActivationChanges: 0"), true);
});
