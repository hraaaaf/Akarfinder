import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/neon-odm-portability-probe.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

test("ODM portability probe stays manual-only and source-read-only", () => {
  const onBlock = workflow.match(/(?:^|\n)on:\n([\s\S]*?)(?:\npermissions:)/)?.[1] ?? "";
  assert.match(onBlock, /workflow_dispatch:/);
  assert.ok(!/^\s*schedule\s*:/m.test(onBlock));
  assert.ok(!/^\s*push\s*:/m.test(onBlock));
  assert.ok(!workflow.includes("NEON_DATABASE_URL"));
  assert.ok(!workflow.includes("--clean"));
  assert.ok(!workflow.includes("drop table"));
});

test("ODM portability probe exports only the current serving dependency candidates", () => {
  const tables = [...workflow.matchAll(/--table=public\.([a-z0-9_]+)/g)].map((m) => m[1]);
  assert.deepEqual(tables, [
    "thin_index_search_documents",
    "source_policy_registry",
    "listing_sources",
    "professional_listing_ownership",
    "search_business_entitlements",
  ]);
});

test("ODM portability probe proves vanilla PG17 restore and content parity", () => {
  assert.match(workflow, /PG_IMAGE:\s*postgres:17/);
  assert.match(workflow, /Prove selected ODM tables are dependency-closed/);
  assert.match(workflow, /Verify source and scratch ODM content parity/);
  assert.match(workflow, /row-count mismatch/);
  assert.match(workflow, /content digest mismatch/);
  assert.match(workflow, /row_to_json\(t\)::text/);
  assert.match(workflow, /--single-transaction/);
  assert.match(workflow, /--exit-on-error/);
});

test("ODM portability probe never hardcodes a database URL", () => {
  assert.match(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
  assert.ok(!/postgres(?:ql)?:\/\/[^$\s"']+@/i.test(workflow));
});
