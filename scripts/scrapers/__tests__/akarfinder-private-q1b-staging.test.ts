import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("db/baselines/akarfinder_private_q1b_staging_2026_11_08.sql", "utf8");

test("historical Q1B staging lives outside public and cannot be exposed by default", () => {
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS akarfinder_internal/);
  assert.match(sql, /CREATE TABLE akarfinder_internal\.historical_listing_observations/);
  assert.doesNotMatch(sql, /CREATE TABLE public\./);
  assert.match(sql, /REVOKE ALL ON SCHEMA akarfinder_internal FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(sql, /REVOKE ALL ON ALL TABLES IN SCHEMA akarfinder_internal FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.doesNotMatch(sql, /CREATE POLICY/);
  assert.doesNotMatch(sql, /GRANT SELECT/);
});

test("private table hardcodes no-publication and unverified rights", () => {
  assert.match(sql, /rights_status = 'unknown_not_proven'/);
  assert.match(sql, /publication_state = 'private_historical_only'/);
  assert.match(sql, /is_public = false/);
  assert.doesNotMatch(sql, /seller_name|phone_whatsapp|image_urls|thumbnail_url/);
});

test("historical source identity cannot duplicate and SQL remains atomic", () => {
  assert.match(sql, /UNIQUE \(source_domain, source_listing_id, observed_at_raw\)/);
  assert.match(sql, /UNIQUE \(canonical_url\)/);
  assert.match(sql, /historical_staging_must_be_new/);
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
});