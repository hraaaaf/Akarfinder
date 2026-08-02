import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/api/search/route.ts", "utf8");

test("Canary routing evaluates ODM before starting Legacy search", () => {
  const canaryGate = source.indexOf("if (shouldServeOdmPublicCanary(stableKey))");
  const odmSearch = source.indexOf("await searchPublicRepresentations", canaryGate);
  const firstLegacySearch = source.indexOf("await searchListings(query)");

  assert.ok(canaryGate >= 0, "Canary gate must exist");
  assert.ok(odmSearch > canaryGate, "ODM search must run inside Canary gate");
  assert.ok(firstLegacySearch > odmSearch, "Legacy must not run before the ODM Canary attempt");
});

test("Legacy remains available as an explicit Canary fallback", () => {
  assert.match(source, /catch \(error\)[\s\S]*?\[odm-public-canary:fallback\][\s\S]*?await searchListings\(query\)/);
});

test("non-Canary traffic still serves Legacy and schedules Shadow comparison", () => {
  assert.match(source, /const legacyResult = await searchListings\(query\);[\s\S]*?scheduleOdmDualReadShadow\(query, legacyResult\)/);
});
