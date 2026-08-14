import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260814194500_backfill_strong_evidence_listing_prices.sql",
  "utf8",
);

test("price recovery fills only missing prices from exact active source URL matches", () => {
  assert.match(migration, /ls\.is_active/);
  assert.match(migration, /lower\(tid\.canonical_url\) = lower\(coalesce\(nullif\(ls\.listing_url/);
  assert.match(migration, /tid\.normalized_price_mad is null/);
  assert.match(migration, /pl\.price_mad > 0/);
});

test("price recovery requires explicit amount and currency evidence", () => {
  assert.match(migration, /regexp_replace\(pl\.price_mad::text/);
  assert.match(migration, /regexp_replace\(lower\(pl\.title\)/);
  assert.match(migration, /dh\|mad\|dirham\|dirhams/);
  assert.match(migration, /having count\(distinct price_mad\) = 1/);
});

test("price recovery never overwrites an existing thin-index price", () => {
  const nullGuards = migration.match(/normalized_price_mad is null/g) ?? [];
  assert.ok(nullGuards.length >= 2);
  assert.doesNotMatch(migration, /set normalized_price_mad = coalesce\(/);
});
