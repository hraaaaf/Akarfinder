import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicEligibleDistrictTotal } from "../../../lib/search/public-district-total.ts";
import { buildPublicSourceOrderBy, pickAuthorizedActiveSource } from "../../../lib/db/preferred-public-source-order.ts";

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


test("Supabase public search prioritizes active authorized source over older third-party source", () => {
  const sources = [
    { source_name: "avito", is_active: true, first_seen_at: "2025-01-01" },
    { source_name: " partner_csv ", is_active: true, first_seen_at: "2026-11-08" },
  ];
  assert.equal(pickAuthorizedActiveSource(sources, ["owner_declared", "partner_csv"])?.source_name.trim(), "partner_csv");
  assert.equal(pickAuthorizedActiveSource(sources, ["owner_declared"]), undefined);
  assert.equal(pickAuthorizedActiveSource([{ source_name: "partner_csv", is_active: false }], ["partner_csv"]), undefined);
  const code = readFileSync("lib/db/supabase-listings.ts", "utf8");
  assert.match(code, /pickAuthorizedActiveSource\(sources, PUBLIC_AUTHORIZED_SOURCE_NAMES\)/);
  assert.match(code, /query\.public_search_only === true/);
});


test("fresh Supabase rejects the unported Neon ODM cursor and routes to structured fallback", () => {
  const cursor = readFileSync("lib/search-gateway/public-search-cursor.ts", "utf8");
  assert.match(cursor, /getDbProvider\(\) !== "neon"/);
  assert.match(cursor, /throw new Error\("public_search_index_unavailable"\)/);
  assert.match(router, /error\.message === "public_search_index_unavailable"/);
  assert.match(router, /dependencies\.searchLegacy\(legacyQuery\)/);
});

test("Supabase public structured page filters authorized sources inside the counted DB join", () => {
  const listings = readFileSync("lib/db/supabase-listings.ts", "utf8");
  assert.match(listings, /query\.public_search_only === true && !isPersistedOpenSerpListingsEnabled\(\)/);
  assert.match(listings, /firstPartyOnly \? "listing_sources!inner" : "listing_sources"/);
  assert.match(listings, /\.eq\("listing_sources\.is_active", true\)/);
  assert.match(listings, /\.in\("listing_sources\.source_name", PUBLIC_AUTHORIZED_SOURCE_NAMES\)/);
  assert.match(listings, /\{ count: "exact" \}/);
  assert.match(listings, /mapToDbRow\(row, resolvedByListingId\.get\(row\.id\), query\.public_search_only === true\)/);
});
