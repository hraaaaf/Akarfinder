import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../../supabase/migrations/20260730183000_odm_canonical_vocabulary_parity_v1.sql",
  import.meta.url,
);

test("historical ODM vocabulary is repaired through authoritative normalizers", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /odm04_normalize_property_type\(normalized_property_type\)/);
  assert.match(sql, /odm04_normalize_intent\(normalized_intent\)/);
  assert.match(sql, /canonical_property_type is not null/);
  assert.match(sql, /canonical_intent is not null/);
  assert.match(sql, /coalesce\(c\.canonical_property_type, d\.normalized_property_type\)/);
  assert.match(sql, /coalesce\(c\.canonical_intent, d\.normalized_intent\)/);
});

test("unknown values are preserved instead of being erased", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.doesNotMatch(sql.toLowerCase(), /set\s+normalized_property_type\s*=\s*c\.canonical_property_type/);
  assert.doesNotMatch(sql.toLowerCase(), /set\s+normalized_intent\s*=\s*c\.canonical_intent/);
  assert.doesNotMatch(sql.toLowerCase(), /delete from|truncate|drop table|drop column/);
});

test("private parity report proves aliases and preserves public boundaries", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /odm_canonical_vocabulary_parity_report_v1/);
  assert.match(sql, /legacy_property_aliases_absent/);
  assert.match(sql, /legacy_buy_absent/);
  assert.match(sql, /appartement_alias_matches_apartment/);
  assert.match(sql, /buy_alias_matches_sale/);
  assert.match(sql, /revoke all on function public\.odm_canonical_vocabulary_parity_report_v1\(\) from public/);
  assert.match(sql, /grant execute on function public\.odm_canonical_vocabulary_parity_report_v1\(\) to service_role/);
  assert.match(sql, /'canary_unchanged',true/);
});
