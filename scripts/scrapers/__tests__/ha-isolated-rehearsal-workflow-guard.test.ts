import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../../.github/workflows/ha-isolated-rehearsal.yml", import.meta.url),
  "utf8",
);

test("isolated HA rehearsal is manual-only and provider-secret free", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
  assert.doesNotMatch(workflow, /NEON_DATABASE_URL_DIRECT/);
});

test("isolated HA rehearsal uses two disposable PostgreSQL 17 nodes", () => {
  assert.match(workflow, /postgres:17/);
  assert.match(workflow, /akarfinder-ha-supabase-sim/);
  assert.match(workflow, /akarfinder-ha-neon-sim/);
  assert.match(workflow, /docker network create/);
});

test("isolated HA rehearsal mutates canary only", () => {
  assert.match(workflow, /akarfinder_ha_replication_canary/);
  assert.doesNotMatch(workflow, /property_listings|buyer_leads|seller_property_drafts|thin_index_search_documents/);
});

test("isolated HA rehearsal proves forward and reverse INSERT UPDATE DELETE", () => {
  assert.match(workflow, /forward INSERT did not replicate/);
  assert.match(workflow, /forward UPDATE did not replicate/);
  assert.match(workflow, /forward DELETE did not replicate/);
  assert.match(workflow, /reverse INSERT did not replicate/);
  assert.match(workflow, /reverse UPDATE did not replicate/);
  assert.match(workflow, /reverse DELETE did not replicate/);
});

test("isolated HA rehearsal exercises origin filtering without claiming provider proof", () => {
  assert.match(workflow, /with \(copy_data=false, origin=none\)/);
  assert.match(workflow, /provider_specific_certification: false/);
  assert.match(workflow, /Does not prove Supabase or Neon provider privileges/);
  assert.match(workflow, /Does not prove provider-specific origin behavior/);
});

test("isolated HA rehearsal requires cleanup and anti-loop proof", () => {
  assert.match(workflow, /anti-loop count proof failed/);
  assert.match(workflow, /cleanup failed/);
  assert.match(workflow, /anti_loop_count_proof: "PASS"/);
  assert.match(workflow, /cleanup: "PASS"/);
});

test("isolated HA rehearsal has a secret leakage guard", () => {
  assert.match(workflow, /Guard artifact against secret leakage/);
  assert.match(workflow, /Secret-like material detected/);
});
