import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/20260814203000_price_extraction_v2_safe_text_backfill.sql",
  "utf8",
);

test("price extraction v2 fills only missing public LISTING rows", () => {
  assert.match(sql, /document_kind = 'LISTING'/);
  assert.match(sql, /display_eligibility in \('eligible_primary', 'eligible_secondary'\)/);
  assert.ok((sql.match(/normalized_price_mad is null/g) ?? []).length >= 2);
});

test("price extraction v2 is source-aware and listing-url scoped", () => {
  for (const domain of ["agenz.ma", "1immo.ma", "masaken.ma", "mouldar.com", "mubawab.ma"]) {
    assert.match(sql, new RegExp(domain.replace(".", "\\.")));
  }
  assert.match(sql, /canonical_url ~ '\/a\/\[0-9\]\+\/'/);
  assert.match(sql, /canonical_url ~ '\/\[0-9a-f\]\{8\}\$'/);
});

test("price extraction v2 rejects per-m2 and ambiguous low prices", () => {
  assert.match(sql, /m\[²2\]/);
  assert.match(sql, /amount < 10000/);
  assert.match(sql, /amount < 1000/);
});

test("price extraction v2 normalizes decimal .00 before digit parsing", () => {
  assert.match(sql, /\(\[\.,\]\)00\$/);
});
