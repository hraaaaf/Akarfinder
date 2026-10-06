import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CRITICAL_RUNTIME_FILES = [
  "app/api/search/gateway/route.ts",
  "lib/search-gateway/public-search-cursor.ts",
  "lib/search-gateway/seed-thin-index.ts",
  "lib/map/city-market-intelligence-live.ts",
  "lib/map/rabat-market-intelligence-live.ts",
  "lib/map/neon-listing-market-observations.ts",
  "lib/seller/owner-listing-projection.ts",
  "lib/odm/odm-shadow-telemetry-store.ts",
  "lib/search/structured-district-total.ts",
] as const;

test("Neon-only critical Search/Market paths do not import or reference Supabase", async () => {
  for (const path of CRITICAL_RUNTIME_FILES) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(
      source,
      /supabase|SUPABASE/,
      `${path} must not reference Supabase on the Neon-only runtime path`,
    );
  }
});

test("Neon runtime read adapter stays read-only", async () => {
  const source = await readFile("lib/db/neon-read-client.ts", "utf8");
  assert.match(source, /SELECT /);
  assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|UPSERT|ALTER|DROP|CREATE)\b/i);
});


test("Neon fallback requests public-only rows", async () => {
  const source = await readFile("lib/search/database-search.ts", "utf8");
  assert.ok(source.includes("public_search_only: true"));
});


test("Market runtime reads the existing Neon listing store, not legacy geo/thin-index tables", async () => {
  const helper = await readFile("lib/map/neon-listing-market-observations.ts", "utf8");
  const cityReader = await readFile("lib/map/city-market-intelligence-live.ts", "utf8");
  const rabatReader = await readFile("lib/map/rabat-market-intelligence-live.ts", "utf8");

  assert.match(helper, /public\.property_listings/);
  assert.match(helper, /public\.listing_sources/);
  assert.doesNotMatch(cityReader + rabatReader, /geo_entities|geo_resolution_events|thin_index_search_documents|source_offer_seeds/);
  assert.match(helper, /fresh:\s*false/);
});


test("Search Gateway treats an absent Neon ODM index as a capability state", async () => {
  const cursor = await readFile("lib/search-gateway/public-search-cursor.ts", "utf8");
  const route = await readFile("app/api/search/gateway/route.ts", "utf8");
  assert.match(cursor, /to_regproc\('public\.search_public_representations_v2'\)/);
  assert.match(cursor, /public_search_index_unavailable/);
  assert.match(route, /message === "public_search_index_unavailable"/);
});
