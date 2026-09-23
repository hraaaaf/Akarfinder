import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/neon-owner-read-portability-probe.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

test("owner-read portability probe is manual-only and never writes Neon", () => {
  const onBlock = workflow.match(/(?:^|\n)on:\n([\s\S]*?)(?:\npermissions:)/)?.[1] ?? "";
  assert.match(onBlock, /workflow_dispatch:/);
  assert.ok(!/^\s*schedule\s*:/m.test(onBlock));
  assert.ok(!/^\s*push\s*:/m.test(onBlock));
  assert.ok(!workflow.includes("NEON_DATABASE_URL"));
  assert.ok(!workflow.includes("--clean"));
  assert.ok(!workflow.includes("drop table"));
});

test("owner-read portability probe exports only the relational read closure", () => {
  const tables = [...workflow.matchAll(/--table=public\.([a-z0-9_]+)/g)].map((m) => m[1]);
  assert.deepEqual(tables, [
    "buyer_leads",
    "seller_property_drafts",
    "seller_listing_publications",
    "owner_listing_representations",
  ]);
  assert.ok(!workflow.includes("seller_property_draft_photos"));
  assert.ok(!workflow.includes("storage."));
  assert.ok(!workflow.includes("auth."));
});

test("owner-read portability probe proves PG17 restore and content parity", () => {
  assert.match(workflow, /PG_IMAGE:\s*postgres:17/);
  assert.match(workflow, /Prove owner-read tables are dependency-closed/);
  assert.match(workflow, /Verify source and scratch owner content parity/);
  assert.match(workflow, /row-count mismatch/);
  assert.match(workflow, /content digest mismatch/);
  assert.match(workflow, /--single-transaction/);
  assert.match(workflow, /--exit-on-error/);
});

test("owner-read portability probe never hardcodes a database URL", () => {
  assert.match(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
  assert.ok(!/postgres(?:ql)?:\/\/[^$\s"']+@/i.test(workflow));
});
