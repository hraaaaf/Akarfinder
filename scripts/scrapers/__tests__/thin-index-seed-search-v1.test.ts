import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const thinIndexSource = readFileSync("lib/search-gateway/seed-thin-index.ts", "utf8");
const gatewayRoute = readFileSync("app/api/search/gateway/route.ts", "utf8");

test("thin-index projection remains source-safe and external-only", () => {
  assert.match(thinIndexSource, /search_result_display_mode:\s*"thin_indexed_seed"/);
  assert.match(thinIndexSource, /can_show_thumbnail:\s*false/);
  assert.match(thinIndexSource, /can_show_contact:\s*false/);
  assert.match(thinIndexSource, /can_show_gallery:\s*false/);
  assert.match(thinIndexSource, /can_cache_thumbnail:\s*false/);
  assert.match(thinIndexSource, /can_download_thumbnail:\s*false/);
  assert.match(thinIndexSource, /primary_cta:\s*"view_original"/);
  assert.match(thinIndexSource, /primary_cta_label:\s*"Voir la source originale"/);
  assert.match(thinIndexSource, /thumbnail_risk_accepted:\s*false/);
});

test("thin-index admission remains registry-pattern and freshness gated", () => {
  assert.match(thinIndexSource, /getListingUrlPatterns/);
  assert.match(thinIndexSource, /freshness_status !== "seed_only"/);
  assert.match(thinIndexSource, /freshness_status !== "fresh_confirmed"/);
  assert.match(thinIndexSource, /listingPatterns\.length === 0/);
});

test("gateway appends the bounded thin index in configured and degraded paths", () => {
  assert.match(gatewayRoute, /appendSeedThinIndexResults/);
  assert.match(gatewayRoute, /provider_not_configured/);
  assert.match(gatewayRoute, /maxResults:\s*100/);
  assert.ok((gatewayRoute.match(/appendSeedThinIndexResults/g) ?? []).length >= 3);
});
