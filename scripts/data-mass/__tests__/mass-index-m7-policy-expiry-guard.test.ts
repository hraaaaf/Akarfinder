import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const root = process.cwd();
const previousMigrationPath = join(
  root,
  "supabase/migrations/20260824092200_m7_public_search_link_only_recovery.sql",
);
const guardMigrationPath = join(
  root,
  "supabase/migrations/20260826200000_mass_index_m7_policy_expiry_guard.sql",
);

const previousMigration = readFileSync(previousMigrationPath, "utf8");
const guardMigration = readFileSync(guardMigrationPath, "utf8");

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test("M7 expiry guard targets the exact current RPC regression", () => {
  assert.equal(
    occurrences(previousMigration, "and pol.review_status in ('current', 'due_soon')"),
    2,
  );
  assert.equal(occurrences(previousMigration, "and pol.policy_effective_at <= now()"), 0);
  assert.equal(occurrences(previousMigration, "and pol.policy_expires_at > now()"), 0);
});

test("M7 expiry guard restores an effective and non-expired window on both policy lanes", () => {
  assert.match(guardMigration, /pg_get_functiondef\(v_signature\)/);
  assert.match(guardMigration, /v_target_count <> 2/);
  assert.match(guardMigration, /and pol\.policy_effective_at is not null/);
  assert.match(guardMigration, /and pol\.policy_effective_at <= now\(\)/);
  assert.match(guardMigration, /and pol\.policy_expires_at is not null/);
  assert.match(guardMigration, /and pol\.policy_expires_at > now\(\)/);
  assert.match(guardMigration, /execute replace\(v_definition, v_target, v_replacement\)/);
  assert.match(guardMigration, /v_effective_count <> 2 or v_expiry_count <> 2/);
});

test("M7 expiry guard is catalog-only and preserves the privileged RPC ACL", () => {
  assert.doesNotMatch(
    guardMigration,
    /\b(insert\s+into|update|delete\s+from)\s+public\.(source_policy_registry|thin_index_search_documents|source_offer_seeds|listing_sources)\b/i,
  );
  assert.match(
    guardMigration,
    /revoke all on function public\.search_public_representations_v2[\s\S]*from PUBLIC, anon, authenticated;/,
  );
  assert.match(
    guardMigration,
    /grant execute on function public\.search_public_representations_v2[\s\S]*to service_role;/,
  );
});
