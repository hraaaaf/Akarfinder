import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const apiRoute = readFileSync("app/api/search/route.ts", "utf8");
const router = readFileSync("lib/odm/odm-public-routing.ts", "utf8");

test("public routing evaluates ODM before starting Legacy search", () => {
  const canaryGate = router.indexOf("if (shouldServeOdmPublicCanary(input.stableKey, dependencies.env))");
  const odmSearch = router.indexOf("await dependencies.searchOdm", canaryGate);
  const firstLegacySearch = router.indexOf("await dependencies.searchLegacy", odmSearch);

  assert.ok(canaryGate >= 0, "ODM routing gate must exist");
  assert.ok(odmSearch > canaryGate, "ODM search must run inside the routing gate");
  assert.ok(firstLegacySearch > odmSearch, "Legacy must not run before the ODM attempt");
});

test("Legacy remains available as an explicit observable fallback", () => {
  assert.match(router, /catch \(error\)[\s\S]*?stage: "odm"[\s\S]*?await dependencies\.searchLegacy\(legacyQuery\)/);
  assert.match(router, /lane: "legacy_fallback"/);
  assert.match(router, /event: "route_failed"/);
});

test("non-ODM traffic still serves Legacy and schedules Shadow comparison", () => {
  assert.match(router, /const result = await dependencies\.searchLegacy\(legacyQuery\);[\s\S]*?lane: "legacy_primary"/);
  assert.match(apiRoute, /routed\.lane === "legacy_primary"[\s\S]*?scheduleOdmDualReadShadow\(query, routed\.result\)/);
});
