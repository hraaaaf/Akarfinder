import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicEligibleDistrictTotal } from "../../../lib/search/public-district-total.ts";
import { buildPublicSourceOrderBy } from "../../../lib/db/preferred-public-source-order.ts";

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


test("Maârif: zero publicly admissible listings must not retain five SQL-counted rows", () => {
  assert.equal(publicEligibleDistrictTotal({
    districtRequested: true,
    scanComplete: true,
    eligibleMatches: 0,
    rawTotal: 500,
    structuredDistrictTotal: 5,
  }), 0);
});

test("district total uses actual public matches when the whole scan is complete", () => {
  assert.equal(publicEligibleDistrictTotal({
    districtRequested: true,
    scanComplete: true,
    eligibleMatches: 2,
    rawTotal: 500,
    structuredDistrictTotal: 5,
  }), 2);
});

test("incomplete scans and non-district search never falsely claim an exact eligible count", () => {
  assert.equal(publicEligibleDistrictTotal({
    districtRequested: true,
    scanComplete: false,
    eligibleMatches: 0,
    rawTotal: 500,
    structuredDistrictTotal: 5,
  }), 5);
  assert.equal(publicEligibleDistrictTotal({
    districtRequested: false,
    scanComplete: true,
    eligibleMatches: 0,
    rawTotal: 500,
    structuredDistrictTotal: null,
  }), 500);
});


test("public Neon lateral selector ranks verified authorized source ahead of older legacy representations", () => {
  const order = buildPublicSourceOrderBy(["$2", "$3"]);
  assert.equal(order, "CASE WHEN lower(trim(source_name)) IN ($2,$3) THEN 0 ELSE 1 END, first_seen_at NULLS LAST,id");
  const code = readFileSync("lib/db/neon-listings.ts", "utf8");
  assert.match(code, /publicSourcePlaceholders = q\.public_search_only/);
  assert.match(code, /const sourceOrderBy = buildPublicSourceOrderBy\(publicSourcePlaceholders\)/);
  assert.match(code, /ORDER BY \$\{sourceOrderBy\} LIMIT 1/);
});

test("non-public Neon queries preserve their original chronological source selection", () => {
  assert.equal(buildPublicSourceOrderBy([]), "first_seen_at NULLS LAST,id");
});

test("source selector rejects interpolation of arbitrary source text into SQL", () => {
  assert.throws(() => buildPublicSourceOrderBy(["$1); DROP TABLE listing_sources; --"]), /invalid_public_source_placeholder/);
});
