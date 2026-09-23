import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/neon-core-db-migration.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

test("core migration stays manual-only and defaults to validate", () => {
  const onBlock = workflow.match(/(?:^|\n)on:\n([\s\S]*?)(?:\npermissions:)/)?.[1] ?? "";
  assert.match(onBlock, /workflow_dispatch:/);
  assert.ok(!/^\s*schedule\s*:/m.test(onBlock));
  assert.ok(!/^\s*push\s*:/m.test(onBlock));
  assert.match(onBlock, /default:\s*"validate"/);
});

test("core migration exports only the approved four-table DB-first set", () => {
  const tables = [...workflow.matchAll(/--table=public\.([a-z0-9_]+)/g)].map((m) => m[1]);
  assert.deepEqual(tables, [
    "property_listings",
    "listing_sources",
    "property_clusters",
    "property_cluster_members",
  ]);
  assert.ok(!workflow.includes("--schema=public"));
  assert.ok(!workflow.includes("auth."));
  assert.ok(!workflow.includes("storage."));
});

test("validate path proves restore closure on clean PostgreSQL 17 before target apply", () => {
  assert.match(workflow, /PG_IMAGE:\s*postgres:17/);
  assert.match(workflow, /Start clean PostgreSQL 17 scratch database/);
  assert.match(workflow, /Prove selected dump is dependency-closed on vanilla PG17/);
  assert.match(workflow, /Verify source and scratch row-count parity/);
  assert.match(workflow, /--single-transaction/);
  assert.match(workflow, /--exit-on-error/);
});

test("apply path is explicit, direct-only, and refuses target overwrite", () => {
  assert.match(workflow, /if:\s*inputs\.mode == 'apply'/);
  assert.match(workflow, /Missing NEON_DATABASE_URL_DIRECT/);
  assert.match(workflow, /\*-pooler\.\*/);
  assert.match(workflow, /Fail closed if target core tables already exist/);
  assert.match(workflow, /Target already contains one or more core tables; refusing implicit overwrite/);
  assert.ok(!workflow.includes("--clean"));
  assert.ok(!workflow.includes("drop table"));
});

test("migration URLs are secret-backed and never hardcoded", () => {
  assert.match(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
  assert.match(workflow, /NEON_DATABASE_URL_DIRECT/);
  assert.ok(!/postgres(?:ql)?:\/\/[^$\s"']+@/i.test(workflow));
});
