import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runner = readFileSync("scripts/data-mass/national-mass-m4-plan-live.ts", "utf8");
const planner = readFileSync("scripts/data-mass/national-mass-m4-plan.ts", "utf8");

test("M4 live certification remains read-only and source-network free", () => {
  assert.doesNotMatch(runner, /\.insert\s*\(/);
  assert.doesNotMatch(runner, /\.upsert\s*\(/);
  assert.doesNotMatch(runner, /\.update\s*\(/);
  assert.doesNotMatch(runner, /\.delete\s*\(/);
  assert.doesNotMatch(runner, /fetch\s*\(/);
  assert.match(runner, /databaseWrites:\s*0/);
  assert.match(runner, /sourceNetworkRequests:\s*0/);
  assert.match(runner, /directFetches:\s*0/);
});

test("M4 uses only the seven M3-positive domains and native providers", () => {
  for (const domain of [
    "marocannonces.com",
    "domio.ma",
    "sakane.ma",
    "1000-annonces.com",
    "housing.place",
    "expat.com",
    "milkiya.ma",
  ]) assert.match(planner, new RegExp(domain.replaceAll(".", "\\.")));

  for (const excluded of ["yakeey.com", "2p.ma", "portail-immobilier.ma"]) {
    assert.doesNotMatch(planner, new RegExp(`\\\"${excluded.replaceAll(".", "\\.")}\\\"`));
  }
  assert.match(runner, /openserp/);
  assert.match(runner, /serper_mass_harvest/);
  assert.doesNotMatch(runner, /serper_search/);
});

test("M4 does not trust legacy discovery_status", () => {
  assert.doesNotMatch(runner, /discovery_status/);
  assert.match(runner, /buildUniversalCandidatePromotionManifest/);
});
