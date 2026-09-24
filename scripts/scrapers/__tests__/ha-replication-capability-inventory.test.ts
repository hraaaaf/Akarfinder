import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inventorySql = readFileSync(
  new URL("../../ha-dr/logical-replication-capability-inventory.sql", import.meta.url),
  "utf8",
);

test("HA capability inventory is transactionally read-only", () => {
  assert.match(inventorySql, /BEGIN TRANSACTION READ ONLY;/);
  assert.match(inventorySql, /COMMIT;/);

  assert.doesNotMatch(
    inventorySql,
    /\b(?:insert|update|delete|alter|drop|create|truncate|grant|revoke|copy)\b/i,
  );
});

test("HA capability inventory proves replication prerequisites", () => {
  assert.match(inventorySql, /current_setting\('wal_level'\)/);
  assert.match(inventorySql, /current_setting\('max_replication_slots'\)/);
  assert.match(inventorySql, /current_setting\('max_wal_senders'\)/);
  assert.match(inventorySql, /rolreplication/);
  assert.match(inventorySql, /pg_replication_slots/);
  assert.match(inventorySql, /pg_subscription/);
});

test("HA capability inventory covers replica identity, PKs and sequences", () => {
  assert.match(inventorySql, /relreplident/);
  assert.match(inventorySql, /PRIMARY KEY/);
  assert.match(inventorySql, /is_identity/);
  assert.match(inventorySql, /column_default LIKE 'nextval\(%'/);
  assert.match(inventorySql, /FROM pg_sequences/);
});

test("HA capability inventory contains every current candidate HA table", () => {
  const tables = [
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

  for (const table of tables) {
    assert.match(inventorySql, new RegExp(`\\('${table}\\'`));
  }
});
