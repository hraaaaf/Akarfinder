import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../../.github/workflows/ha-capability-inventory.yml", import.meta.url),
  "utf8",
);

test("HA capability inventory workflow is manual-only", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /\npush:/);
});

test("HA capability inventory uses direct source and target secrets", () => {
  assert.match(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
  assert.match(workflow, /NEON_DATABASE_URL_DIRECT/);
  assert.match(workflow, /direct\/unpooled PostgreSQL URL/);
  assert.match(workflow, /\*pooler\*/);
});

test("HA capability inventory executes only the canonical read-only SQL file", () => {
  assert.match(workflow, /logical-replication-capability-inventory\.sql/);
  assert.match(workflow, /BEGIN TRANSACTION READ ONLY/);
  assert.match(workflow, /Mutation-like token found/);
  assert.doesNotMatch(workflow, /pg_restore/);
  assert.doesNotMatch(workflow, /pg_dump/);
});

test("HA capability inventory creates separate Supabase and Neon proofs", () => {
  assert.match(workflow, /SUPABASE_CAPABILITY_INVENTORY\.txt/);
  assert.match(workflow, /NEON_CAPABILITY_INVENTORY\.txt/);
  assert.match(workflow, /HA_CAPABILITY_INVENTORY_SHA256SUMS\.txt/);
});

test("HA capability inventory guards artifacts against secrets", () => {
  assert.match(workflow, /Guard artifacts against secret leakage/);
  assert.match(workflow, /postgres\(ql\)\?:\/\//);
  assert.match(workflow, /service_role/);
  assert.match(workflow, /SUPABASE_DATABASE_URL/);
  assert.match(workflow, /NEON_DATABASE_URL/);
});
