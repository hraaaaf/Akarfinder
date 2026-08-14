import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260814170500_search_ranking_v2.sql";
const cursorPath = "lib/search-gateway/public-search-cursor.ts";

test("ranking v2 exposes explicit business lanes and preserves external fallback", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /premium_promoter/);
  assert.match(sql, /partner_agency/);
  assert.match(sql, /coalesce\(\(\s*select min\(e\.business_lane\)/s);
  assert.match(sql, /\), 3\)::smallint as business_lane/);
  assert.match(sql, /business_lane in \(0, 1\)/);
});

test("ranking v2 scores relevance, quality, freshness and completeness", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /ts_rank_cd/);
  assert.match(sql, /ranking_quality_boost/);
  assert.match(sql, /freshness_boost/);
  assert.match(sql, /completeness_boost/);
  assert.match(sql, /eligible_primary' then 0\.04/);
});

test("ranking v2 deduplicates exact URLs and applies bounded source diversity penalty", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /partition by lower\(b\.canonical_url\)/);
  assert.match(sql, /where x\.url_rank = 1/);
  assert.match(sql, /partition by d\.business_lane, d\.source_domain/);
  assert.match(sql, /least\(0\.08::real/);
});

test("public cursor uses only ranking v2 and invalidates v1 cursors", async () => {
  const source = await readFile(cursorPath, "utf8");

  assert.match(source, /const CURSOR_VERSION = 2 as const/);
  assert.match(source, /search_public_representations_v2/);
  assert.doesNotMatch(source, /search_public_representations_v1/);
  assert.match(source, /lane: tail\.lane_weight/);
  assert.match(source, /rank: tail\.ranking_score/);
});
