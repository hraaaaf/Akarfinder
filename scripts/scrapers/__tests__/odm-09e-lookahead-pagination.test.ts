import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cursorAdapter = readFileSync(
  resolve(__dirname, "../../../lib/search-gateway/public-search-cursor.ts"),
  "utf8",
);
const migration = readFileSync(
  resolve(__dirname, "../../../supabase/migrations/20260726194500_fix_public_search_lookahead_limit.sql"),
  "utf8",
);

test("public API remains capped at 100 while requesting one internal lookahead row", () => {
  assert.match(cursorAdapter, /const MAX_PAGE_SIZE = 100/);
  assert.match(cursorAdapter, /p_limit: pageSize \+ 1/);
  assert.match(cursorAdapter, /const hasMore = rows\.length > pageSize/);
  assert.match(cursorAdapter, /rows\.slice\(0, pageSize\)/);
});

test("Supabase RPC accepts exactly the 101 rows required for a 100-result page", () => {
  assert.match(
    migration,
    /least\(greatest\(coalesce\(p_limit, 50\), 1\), 101\) as result_limit/,
  );
  assert.doesNotMatch(
    migration,
    /least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\) as result_limit/,
  );
});

test("lookahead fix preserves cursor ordering and service-role-only execution", () => {
  for (const token of [
    "c.lane_weight asc",
    "c.ranking_score desc",
    "c.updated_at desc",
    "c.representation_id desc",
    "security invoker",
    "from public, anon, authenticated",
    "to service_role",
  ]) {
    assert.ok(migration.includes(token), `missing invariant: ${token}`);
  }
});
