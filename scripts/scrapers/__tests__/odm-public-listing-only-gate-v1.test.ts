import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath = "supabase/migrations/20260802102000_odm_public_listing_only_gate_v1.sql";
const sql = readFileSync(migrationPath, "utf8");

test("ODM public RPC explicitly filters LISTING documents", () => {
  assert.match(sql, /d\.document_kind\s*=\s*'LISTING'/);
});

test("ODM public RPC preserves the canonical public readmodel and cursor contract", () => {
  assert.match(sql, /public\.public_search_representations_v1/);
  assert.match(sql, /public\.thin_index_search_documents/);
  assert.match(sql, /p_after_representation_id/);
  assert.match(sql, /order by c\.lane_weight asc, c\.ranking_score desc, c\.updated_at desc, c\.representation_id desc/);
});

test("migration does not modify Canary configuration or Legacy search", () => {
  assert.doesNotMatch(sql, /ODM_PUBLIC_CANARY_PERCENT|SEARCH_PROVIDER|searchListings/i);
});
