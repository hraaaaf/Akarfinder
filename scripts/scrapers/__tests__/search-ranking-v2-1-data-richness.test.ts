import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/20260814200500_search_ranking_v2_1_data_richness.sql",
  "utf8",
);

test("ranking v2.1 keeps business lanes and relevance scoring", () => {
  assert.match(sql, /search_business_entitlements/);
  assert.match(sql, /ts_rank_cd/);
  assert.match(sql, /business_lane/);
});

test("ranking v2.1 favors usable price and surface without filtering missing values", () => {
  assert.match(sql, /normalized_price_mad is not null then 0\.06/);
  assert.match(sql, /normalized_surface_m2 is not null then 0\.04/);
  assert.match(sql, /normalized_property_type is not null then 0\.02/);
  assert.match(sql, /normalized_city is not null then 0\.015/);
  assert.match(sql, /normalized_intent is not null then 0\.015/);
  assert.doesNotMatch(sql, /normalized_price_mad is not null\s+and/);
});

test("ranking v2.1 keeps exact dedup and bounded source diversity", () => {
  assert.match(sql, /partition by lower\(b\.canonical_url\)/);
  assert.match(sql, /least\(0\.12::real/);
  assert.match(sql, /\* 0\.006::real/);
});
