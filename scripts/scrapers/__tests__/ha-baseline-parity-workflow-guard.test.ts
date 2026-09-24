import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../../.github/workflows/ha-baseline-parity-proof.yml", import.meta.url),
  "utf8",
);

const expectedTables = [
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
];

test("HA baseline parity workflow is manual-only and read-only by construction", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /\npush:/);

  for (const forbidden of [
    /pg_restore/,
    /\binsert\s+into\b/i,
    /\bupdate\s+public\./i,
    /\bdelete\s+from\b/i,
    /\btruncate\b/i,
    /\bdrop\s+(table|schema|database|subscription|publication)\b/i,
    /\bcreate\s+(subscription|publication)\b/i,
  ]) {
    assert.doesNotMatch(workflow, forbidden);
  }

  assert.match(workflow, /begin transaction read only/);
});

test("HA baseline parity workflow uses direct source and target secrets", () => {
  assert.match(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
  assert.match(workflow, /NEON_DATABASE_URL_DIRECT/);
  assert.match(workflow, /direct\/unpooled PostgreSQL URL/);
  assert.match(workflow, /\*pooler\*/);
});

test("HA baseline parity workflow covers the entire current HA candidate set", () => {
  for (const table of expectedTables) {
    assert.match(workflow, new RegExp(`\\b${table}\\b`));
  }
});

test("HA baseline parity proves count PK content schema and replica identity parity", () => {
  assert.match(workflow, /row-count mismatch/);
  assert.match(workflow, /PK-set digest mismatch/);
  assert.match(workflow, /content-digest mismatch/);
  assert.match(workflow, /schema fingerprint mismatch/);
  assert.match(workflow, /information_schema\.columns/);
  assert.match(workflow, /pg_get_constraintdef/);
  assert.match(workflow, /pg_indexes/);
  assert.match(workflow, /relrowsecurity/);
  assert.match(workflow, /relreplident::text/);
  assert.match(workflow, /replica identity mismatch/);
  assert.match(workflow, /sequence\/identity metadata mismatch/);
  assert.match(workflow, /fk-consistency-query-generator\.sql/);
  assert.match(workflow, /foreign-key consistency failed/);
  assert.match(workflow, /foreign_key_consistency: true/);
  assert.match(workflow, /pg_sequences/);
  assert.match(workflow, /increment_by/);
  assert.match(workflow, /cache_size/);
  assert.match(workflow, /last_value/);
});

test("HA baseline artifact cannot claim full HA certification", () => {
  assert.match(workflow, /status: "PARITY_PASS"/);
  assert.match(workflow, /certification: "NOT_CERTIFIED"/);
  assert.match(workflow, /does not prove application single-writer fencing/i);
  assert.match(workflow, /Captures sequence metadata\/state including last_value but does not prove future collision safety or is_called semantics/);
  assert.match(workflow, /Does not prove delete propagation, RPO or RTO/);
});

test("HA baseline artifact has an explicit secret-leak guard", () => {
  assert.match(workflow, /Guard artifact against secret leakage/);
  assert.match(workflow, /postgres\(ql\)\?:\/\//);
  assert.match(workflow, /service_role/);
  assert.match(workflow, /SUPABASE_DATABASE_URL/);
  assert.match(workflow, /NEON_DATABASE_URL/);
});
