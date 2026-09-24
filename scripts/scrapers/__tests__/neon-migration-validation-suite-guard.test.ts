import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/neon-migration-validation-suite.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

test("umbrella migration validation suite is manual-only and never touches Neon", () => {
  const onBlock = workflow.match(/(?:^|\n)on:\n([\s\S]*?)(?:\npermissions:)/)?.[1] ?? "";
  assert.match(onBlock, /workflow_dispatch:/);
  assert.ok(!/^\s*schedule\s*:/m.test(onBlock));
  assert.ok(!/^\s*push\s*:/m.test(onBlock));
  assert.ok(!workflow.includes("NEON_DATABASE_URL"));
  assert.ok(!workflow.includes("--clean"));
  assert.ok(!workflow.includes("drop table"));
});

test("umbrella suite covers every currently approved validation dataset", () => {
  for (const name of [
    "core",
    "odm-public-search",
    "owner-read",
    "market-comparables-history",
    "map-market-intelligence",
  ]) {
    assert.ok(workflow.includes(`name: ${name}`), name);
  }

  for (const table of [
    "property_listings",
    "listing_sources",
    "property_clusters",
    "property_cluster_members",
    "thin_index_search_documents",
    "source_policy_registry",
    "professional_listing_ownership",
    "search_business_entitlements",
    "buyer_leads",
    "seller_property_drafts",
    "seller_listing_publications",
    "owner_listing_representations",
    "source_offer_observations",
    "geo_entities",
    "geo_resolution_events",
    "source_offer_seeds",
  ]) {
    assert.ok(workflow.includes(table), table);
  }
});

test("umbrella suite proves PG17 restore plus row-count and digest parity", () => {
  assert.match(workflow, /PG_IMAGE:\s*postgres:17/);
  assert.match(workflow, /Prove dependency closure on vanilla PostgreSQL 17/);
  assert.match(workflow, /Verify source and scratch content parity/);
  assert.match(workflow, /row-count mismatch/);
  assert.match(workflow, /content digest mismatch/);
  assert.match(workflow, /--single-transaction/);
  assert.match(workflow, /--exit-on-error/);
  assert.match(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
});

test("umbrella suite safely passes probe name into the dump container", () => {
  assert.match(workflow, /-e PROBE_NAME="\$PROBE_NAME"/);
  assert.match(workflow, /"\/work\/\$PROBE_NAME\.dump"/);
});
