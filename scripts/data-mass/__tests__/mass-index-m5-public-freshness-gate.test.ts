import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260823103000_mass_index_m5_public_freshness_gate.sql"),
  "utf8",
);
const publicCursor = readFileSync(resolve("lib/search-gateway/public-search-cursor.ts"), "utf8");
const seedFallback = readFileSync(resolve("lib/search-gateway/seed-thin-index.ts"), "utf8");
const gatewayRoute = readFileSync(resolve("app/api/search/gateway/route.ts"), "utf8");

test("M5-B covers both public Thin Index serving RPCs", () => {
  assert.equal(migration.includes("search_public_representations_v2(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamp with time zone,uuid)"), true);
  assert.equal(migration.includes("search_thin_index_v3(text,text,text,text,integer,real,timestamp with time zone,uuid)"), true);
  assert.equal(publicCursor.includes('rpc("search_public_representations_v2"'), true);
  assert.equal(seedFallback.includes('rpc("search_thin_index_v3"'), true);
  assert.equal(gatewayRoute.includes("appendSeedThinIndexResults"), true);
});

test("M5-B public serving is fresh-confirmed only and fail-closed", () => {
  assert.equal(migration.includes("v_old_public constant text := 'd.freshness_status in (''seed_only'', ''fresh_confirmed'')'"), true);
  assert.equal(migration.includes("v_old_thin constant text := 'd.freshness_status in (''seed_only'',''fresh_confirmed'')'"), true);
  assert.equal(migration.includes("v_new constant text := 'd.freshness_status = ''fresh_confirmed''';"), true);
  assert.equal(migration.includes("M5_PUBLIC_FRESHNESS_EXPECTED_PREDICATE_MISSING"), true);
  assert.equal(migration.includes("M5_PUBLIC_FRESHNESS_POSTCONDITION_FAILED"), true);
});

test("M5-B preserves the seed and Thin Index reservoirs", () => {
  const lowered = migration.toLowerCase();
  assert.equal(/\bdelete\s+from\s+public\.source_offer_seeds\b/.test(lowered), false);
  assert.equal(/\bdelete\s+from\s+public\.thin_index_search_documents\b/.test(lowered), false);
  assert.equal(/\bupdate\s+public\.source_offer_seeds\b/.test(lowered), false);
  assert.equal(/\bupdate\s+public\.thin_index_search_documents\b/.test(lowered), false);
  assert.equal(/\binsert\s+into\s+public\.source_offer_seeds\b/.test(lowered), false);
  assert.equal(/\binsert\s+into\s+public\.thin_index_search_documents\b/.test(lowered), false);
});
