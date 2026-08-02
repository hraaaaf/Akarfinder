import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/20260802211500_odm_public_search_single_scan_v1.sql",
  "utf8",
);

test("ODM public RPC scans thin_index_search_documents only once", () => {
  const scans = sql.match(/from public\.thin_index_search_documents/g) ?? [];
  assert.equal(scans.length, 1);
  assert.doesNotMatch(sql, /public_search_representations_v1 r/i);
  assert.match(sql, /d\.document_kind = 'LISTING'/);
});

test("ODM public RPC preserves filters, cursor ordering and total count", () => {
  assert.match(sql, /count\(\*\) over \(\)/i);
  assert.match(sql, /d\.normalized_price_mad >= p_min_price/);
  assert.match(sql, /d\.normalized_surface_m2 <= p_max_surface/);
  assert.match(sql, /order by c\.lane_weight asc, c\.ranking_score desc, c\.updated_at desc, c\.representation_id desc/i);
});
