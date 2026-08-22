import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = new URL(
  "../../../supabase/migrations/20260822145000_mass_index_m2_native_discovery_providers.sql",
  import.meta.url,
);

test("M2 migration admits native OpenSERP and Serper MASS providers into display policy", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const providerList = "'public_sitemap','commoncrawl_cdx','serper_search','serper_mass_harvest','openserp'";
  assert.ok(sql.includes(providerList));
  assert.ok(sql.includes("new.seed_provider not in ('openserp','serper_mass_harvest')"));
});

test("M2 migration reads generic external_index evidence instead of forging serper provenance", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.ok(sql.includes("{external_index,title}"));
  assert.ok(sql.includes("{external_index,snippet}"));
  assert.ok(sql.includes("{external_index,query}"));
  assert.ok(!sql.includes("legacy_persisted_openserp_bridge_v1"));
  assert.ok(!/update\s+public\.source_offer_seeds[\s\S]+seed_provider\s*=\s*'serper_search'/i.test(sql));
});

test("M2 migration is structural only and does not activate public Search", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.ok(sql.includes("mass_index_sync_native_discovery_seed_row"));
  assert.ok(sql.includes("trg_zz_mass_index_sync_native_discovery_seed"));
  assert.ok(!sql.includes("search_public_representations_v2"));
});
