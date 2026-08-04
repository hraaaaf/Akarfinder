import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/search/page.tsx", "utf8");
const router = readFileSync("lib/odm/odm-public-routing.ts", "utf8");

test("visible search page uses the same centralized ODM decision as the API route", () => {
  assert.match(page, /buildSearchStableKey\(publicRequestQuery\)/);
  assert.match(page, /routePublicSearch\(\{/);
  assert.match(page, /publicQuery: publicRequestQuery/);
  assert.match(page, /legacyQuery: resolvedQuery/);
  assert.match(page, /surface: "search_page"/);
  assert.match(router, /shouldServeOdmPublicCanary\(input\.stableKey, dependencies\.env\)/);
  assert.match(router, /searchOdm\(buildOdmPublicSearchInput\(input\.publicQuery\)\)/);
  assert.match(router, /mapOdmPageToSearchResult\(page, input\.publicQuery\)/);
  assert.match(page, /initialSearchResult\s*=\s*await searchVisibleInitialResult\([\s\S]*resolvedQuery,[\s\S]*publicRequestQuery/);
});

test("visible search page preserves fail-safe Legacy fallback and shadow behavior", () => {
  assert.match(router, /lane: "legacy_fallback"/);
  assert.match(router, /searchLegacy\(legacyQuery\)/);
  assert.match(router, /failure_stage: input\.stage/);
  assert.match(page, /routed\.lane === "legacy_primary"/);
  assert.match(page, /scheduleOdmDualReadShadow\(resolvedQuery, routed\.result\)/);
  assert.doesNotMatch(page, /initialSearchResult\s*=\s*await searchListings\(resolvedQuery\)/);
});
