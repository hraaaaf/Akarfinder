import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  "supabase/migrations/20260802213000_odm_public_search_force_custom_plan_v1.sql",
  "utf8",
);

test("ODM public search forces a custom PostgreSQL plan", () => {
  assert.match(migration, /alter function public\.search_public_representations_v1/i);
  assert.match(migration, /set plan_cache_mode = 'force_custom_plan'/i);
});
