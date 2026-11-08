import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("db/baselines/akarfinder_supabase_property_foundation_2026-11-08.sql", "utf8");
test("fresh Supabase property baseline is isolated, private and preserves source provenance", () => {
  assert.match(source, /baseline_requires_empty_property_tables/);
  assert.match(source, /CREATE TABLE public\.property_listings/);
  assert.match(source, /CREATE TABLE public\.listing_sources/);
  assert.match(source, /FOREIGN KEY \(property_listing_id\).*ON DELETE CASCADE/);
  assert.match(source, /ALTER TABLE public\.property_listings ENABLE ROW LEVEL SECURITY/);
  assert.match(source, /ALTER TABLE public\.listing_sources ENABLE ROW LEVEL SECURITY/);
  assert.match(source, /REVOKE ALL ON TABLE.*FROM PUBLIC, anon, authenticated/);
  assert.match(source, /TO service_role/);
  assert.doesNotMatch(source, /GRANT [^;]*TO (?:anon|authenticated)/);
  assert.match(source, /COMMIT;/);
});

test("snapshot keeps the 41/17-column catalog shape and the three operational indexes", () => {
  const listing = source.match(/CREATE TABLE public\.property_listings \(([\s\S]*?)\n\);/)?.[1] ?? "";
  const links = source.match(/CREATE TABLE public\.listing_sources \(([\s\S]*?)\n\);/)?.[1] ?? "";
  const countColumns = (body: string) =>
    body.split("\n").filter((line) => /^  [a-z_][a-z0-9_]* (?:bigint|integer|text|numeric|boolean|jsonb|double precision|timestamp)/.test(line)).length;
  assert.equal(countColumns(listing), 41);
  assert.equal(countColumns(links), 17);
  assert.equal((source.match(/^CREATE INDEX /gm) ?? []).length, 3);
});
