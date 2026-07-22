import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  mapSeedToThinIndexResult,
  seedMatchesThinIndexSearch,
} from "../../../lib/search-gateway/seed-thin-index.js";

const atlasSeed = {
  id: "s1",
  canonical_url: "https://atlasimmobilier.com/en/p/1-bedroom-apartment-for-rent-facing-the-sea-in-essaouira",
  source_domain: "atlasimmobilier.com",
  seed_provider: "public_sitemap" as const,
  freshness_status: "seed_only",
  updated_at: "2026-07-22T00:00:00.000Z",
};

test("registry-approved listing seed can match explicit search filters without becoming a structured listing", () => {
  assert.equal(seedMatchesThinIndexSearch(atlasSeed, {
    city: "Essaouira",
    propertyType: "apartment",
    intent: "rent",
  }), true);

  assert.equal(seedMatchesThinIndexSearch(atlasSeed, {
    city: "Casablanca",
    propertyType: "apartment",
    intent: "rent",
  }), false);
});

test("thin seed result exposes only source-safe external fields", () => {
  const result = mapSeedToThinIndexResult(atlasSeed);
  assert.equal(result.result_origin, "public_sitemap");
  assert.equal(result.search_result_display_mode, "thin_indexed_seed");
  assert.equal(result.can_show_contact, false);
  assert.equal(result.can_show_gallery, false);
  assert.equal(result.can_show_thumbnail, false);
  assert.equal(result.primary_cta, "view_original");
  assert.equal(result.original_url, atlasSeed.canonical_url);
  assert.match(result.result_attribution_label, /sitemap public/i);
  assert.doesNotMatch(result.title, /prix|dh|mad/i);
});

test("gateway route appends seed thin index even when live provider is unavailable", () => {
  const route = readFileSync("app/api/search/gateway/route.ts", "utf8");
  assert.match(route, /appendSeedThinIndexResults/);
  assert.match(route, /provider_not_configured/);
  assert.match(route, /maxResults: 100/);
});
