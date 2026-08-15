import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/20260814205500_guard_daragadir_short_stay_price_without_cadence.sql",
  "utf8",
);

test("DarAgadir short-stay price guard clears cadence-less prices", () => {
  assert.match(sql, /source_domain = 'daragadir\.com'/);
  assert.match(sql, /location-de-vacances/);
  assert.match(sql, /par-jour/);
  assert.match(sql, /journalier/);
  assert.match(sql, /quotidien/);
  assert.match(sql, /nuit/);
  assert.match(sql, /new\.normalized_price_mad := null/);
});

test("guard is scoped to LISTING rows and normalized price writes", () => {
  assert.match(sql, /new\.document_kind = 'LISTING'/);
  assert.match(sql, /before insert or update of normalized_price_mad/);
});
