import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  "supabase/migrations/20260802214500_odm_public_search_plpgsql_custom_plan_v2.sql",
  "utf8",
);

test("ODM public RPC executes under a per-call custom plan", () => {
  assert.match(migration, /language plpgsql/i);
  assert.match(migration, /set_config\('plan_cache_mode',\s*'force_custom_plan',\s*true\)/i);
  assert.match(migration, /return query/i);
  assert.match(migration, /from public\.thin_index_search_documents d/i);
  assert.doesNotMatch(migration, /join public\.thin_index_search_documents/i);
});
