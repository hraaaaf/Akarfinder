import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(path), "utf8");
}

const searchPage = source("app/search/page.tsx");
const sitemap = source("app/sitemap.ts");
const publicRoute = source("app/api/search/route.ts");
const gatewayRoute = source("app/api/search/gateway/route.ts");
const routing = source("lib/odm/odm-public-routing.ts");
const publicCursor = source("lib/search-gateway/public-search-cursor.ts");
const seedThinIndex = source("lib/search-gateway/seed-thin-index.ts");
const citySeo = source("app/immobilier/[city]/page.tsx");
const districtSeo = source("app/immobilier/[city]/[district]/page.tsx");

// M6-A is inventory/certification only. These tests intentionally lock the
// current serving topology before any activation delta is attempted.
test("M6 Search page is noindex and excluded from sitemap", () => {
  assert.equal(searchPage.includes("robots: { index: false, follow: true }"), true);
  assert.equal(searchPage.includes('alternates: { canonical: "/search" }'), true);
  assert.equal(sitemap.includes('"/search"'), false);
});

test("M6 canonical and fallback Thin Index paths are explicit", () => {
  assert.equal(publicCursor.includes('rpc("search_public_representations_v2"'), true);
  assert.equal(seedThinIndex.includes('rpc("search_thin_index_v3"'), true);
  assert.equal(gatewayRoute.includes("appendSeedThinIndexResults"), true);
  assert.equal(gatewayRoute.includes("public_index_degraded: true"), true);
});

test("M6 public /api/search remains canary-governed with legacy lanes", () => {
  assert.equal(publicRoute.includes("routePublicSearch"), true);
  assert.equal(routing.includes("ODM_PUBLIC_CANARY_ENABLED"), true);
  assert.equal(routing.includes("ODM_PUBLIC_CANARY_APPROVED"), true);
  assert.equal(routing.includes("ODM_PUBLIC_CANARY_STOP"), true);
  assert.equal(routing.includes('lane: "legacy_primary"'), true);
  assert.equal(routing.includes('lane: "legacy_fallback"'), true);
  assert.equal(routing.includes('lane: "odm"'), true);
});

test("M6 indexable city and district SEO previews use legacy guarded Search", () => {
  assert.equal(citySeo.includes("robots: { index: true, follow: true }"), true);
  assert.equal(citySeo.includes("searchListings({ city: cityData.displayName, limit: 6 })"), true);
  assert.equal(districtSeo.includes("robots: { index: true, follow: true }"), true);
  assert.equal(districtSeo.includes("searchListings({ city: n.cityDisplayName, district: n.displayName, limit: 6 })"), true);
});

test("M6 baseline script stays read-only", () => {
  const audit = source("scripts/data-mass/mass-index-m6-search-seo-audit.ts");
  for (const mutation of [".insert(", ".update(", ".delete(", ".upsert("]) {
    assert.equal(audit.includes(mutation), false, mutation);
  }
  assert.equal(audit.includes("databaseWrites: 0"), true);
  assert.equal(audit.includes("searchActivationChanges: 0"), true);
  assert.equal(audit.includes("vercelDeployments: 0"), true);
  assert.equal(audit.includes("uniquePropertyMetricClaimed: false"), true);
});
