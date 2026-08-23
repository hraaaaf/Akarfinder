import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const liveSource = readFileSync(resolve("scripts/data-mass/national-mass-m4-plan-live.ts"), "utf8");
const planSource = readFileSync(resolve("scripts/data-mass/national-mass-m4-plan.ts"), "utf8");

test("M4 live planner is structurally read-only", () => {
  assert.equal(/\.(?:insert|upsert|update|delete)\s*\(/.test(liveSource), false);
  assert.equal(/\bfetch\s*\(/.test(liveSource), false);
  assert.equal(liveSource.includes('mode: "read_only"'), true);
  assert.equal(liveSource.includes("databaseWrites: 0"), true);
  assert.equal(liveSource.includes("sourceNetworkRequests: 0"), true);
});

test("M4 persistence projection is metadata-null by construction", () => {
  assert.equal(planSource.includes("metadata: null"), true);
  assert.equal(planSource.includes("projectM4MinimalSeed"), true);
  assert.equal(planSource.includes("CANONICAL_URL_SOURCE_DOMAIN_PROVENANCE_ONLY"), false);
});
