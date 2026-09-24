import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../../ha-dr/fk-consistency-query-generator.sql", import.meta.url),
  "utf8",
);

test("FK consistency generator is read-only", () => {
  for (const forbidden of [
    /\binsert\b/i,
    /\bupdate\b/i,
    /\bdelete\b/i,
    /\btruncate\b/i,
    /\bdrop\b/i,
    /\balter\b/i,
    /\bcreate\b/i,
  ]) {
    assert.doesNotMatch(sql, forbidden);
  }
  assert.match(sql, /pg_constraint/);
  assert.match(sql, /pg_attribute/);
  assert.match(sql, /pg_operator/);
});

test("FK consistency generator supports composite keys and exact FK operators", () => {
  assert.match(sql, /unnest\(fk\.conkey\) with ordinality/);
  assert.match(sql, /unnest\(fk\.confkey\) with ordinality/);
  assert.match(sql, /unnest\(fk\.conpfeqop\) with ordinality/);
  assert.match(sql, /OPERATOR\(%I\.%I\)/);
});

test("FK consistency generator handles MATCH SIMPLE and MATCH FULL", () => {
  assert.match(sql, /when 's' then format/);
  assert.match(sql, /when 'f' then format/);
  assert.match(sql, /all_nonnull/);
  assert.match(sql, /all_null/);
});

test("FK consistency generator fails closed on unsupported match types", () => {
  assert.match(sql, /else 'select 1;'/);
});

test("FK consistency generator scopes to the requested public table", () => {
  assert.match(sql, /to_regclass\(format\('public\.%I', :'table_name'\)\)/);
});
