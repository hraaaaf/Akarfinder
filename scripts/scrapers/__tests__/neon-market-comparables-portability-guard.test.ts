import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/neon-market-comparables-portability-probe.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

test("Market Comparables portability probe is manual-only and target-read-free", () => {
  const onBlock = workflow.match(/(?:^|\n)on:\n([\s\S]*?)(?:\npermissions:)/)?.[1] ?? "";
  assert.match(onBlock, /workflow_dispatch:/);
  assert.ok(!/^\s*schedule\s*:/m.test(onBlock));
  assert.ok(!/^\s*push\s*:/m.test(onBlock));
  assert.ok(!workflow.includes("NEON_DATABASE_URL"));
  assert.ok(!workflow.includes("--clean"));
  assert.ok(!workflow.includes("drop table"));
});

test("Market Comparables portability probe exports exactly the ANN-L8 read closure", () => {
  const tables = [...workflow.matchAll(/--table=public\.([a-z0-9_]+)/g)].map((m) => m[1]);
  assert.deepEqual(tables, [
    "property_listings",
    "listing_sources",
    "property_clusters",
    "property_cluster_members",
    "source_offer_observations",
  ]);
  assert.ok(!workflow.includes("auth."));
  assert.ok(!workflow.includes("storage."));
});

test("Market Comparables portability probe proves PG17 restore and content parity", () => {
  assert.match(workflow, /PG_IMAGE:\s*postgres:17/);
  assert.match(workflow, /Prove Market Comparables tables are dependency-closed/);
  assert.match(workflow, /Verify source and scratch Market Comparables content parity/);
  assert.match(workflow, /row-count mismatch/);
  assert.match(workflow, /content digest mismatch/);
  assert.match(workflow, /--single-transaction/);
  assert.match(workflow, /--exit-on-error/);
});
