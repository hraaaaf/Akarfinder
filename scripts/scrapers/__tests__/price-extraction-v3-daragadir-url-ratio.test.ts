import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/20260815081500_price_extraction_v3_daragadir_url_ratio_backfill.sql",
  "utf8",
);

test("v3 scopes to public DarAgadir LISTING rows with missing price", () => {
  assert.match(sql, /document_kind = 'LISTING'/);
  assert.match(sql, /display_eligibility in \('eligible_primary','eligible_secondary'\)/);
  assert.match(sql, /source_domain = 'daragadir\.com'/);
  assert.ok((sql.match(/normalized_price_mad is null/g) ?? []).length >= 2);
});

test("v3 requires explicit amount and explicit surface from the URL", () => {
  assert.match(sql, /regexp_match\(lower\(canonical_url\).*dh\|dhs\|mad/s);
  assert.match(sql, /surface_match/);
  assert.match(sql, /price_match is not null/);
  assert.match(sql, /surface_match is not null/);
});

test("v3 rejects DarAgadir short-stay cadence", () => {
  for (const token of ["location-de-vacances", "par-jour", "journalier", "quotidien", "nuit"]) {
    assert.match(sql, new RegExp(token));
  }
});

test("v3 enforces empirical sale and rent ratio guardrails", () => {
  assert.match(sql, /amount \/ surface between 2000 and 50000/);
  assert.match(sql, /amount \/ surface between 5 and 500/);
  assert.match(sql, /surface between 15 and 20000/);
});
