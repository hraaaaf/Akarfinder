import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  COMMONCRAWL_MASS_SEED_PROVIDER,
  validateAndMapMassSeed,
} from "../../../lib/acquisition-scale-v1/commoncrawl-mass-seeds";

test("Common Crawl seed provenance is seed_provider, never a freshness channel", () => {
  const mapped = validateAndMapMassSeed({
    canonical_url: "https://masaken.ma/fr/immobilier-maroc/location-appartement-eljadida/343",
    source_domain: "masaken.ma",
    cdx_indexes_seen: ["CC-MAIN-2026-34"],
    first_cdx_timestamp: "20260801000000",
    last_cdx_timestamp: "20260820000000",
    cdx_observation_count: 2,
    listing_pattern_matched: true,
    status_codes_observed: ["200"],
    mime_observed: ["text/html"],
  }, undefined, "2026-08-24T19:30:00.000Z");

  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.row.seed_provider, COMMONCRAWL_MASS_SEED_PROVIDER);
  assert.equal(mapped.row.metadata.source, "commoncrawl_url_index");
  assert.equal(mapped.row.freshness_status, "seed_only");
  assert.equal(mapped.row.fresh_last_seen_at, null);
  assert.deepEqual(mapped.row.fresh_channels, []);
});

test("Common Crawl importer refreshes duplicate CDX observations through the observation-only RPC", () => {
  const source = readFileSync(
    join(process.cwd(), "scripts/openserp/ingest-commoncrawl-mass-seeds.ts"),
    "utf8",
  );

  assert.match(source, /rpc\("odm_upsert_commoncrawl_seed_observations_v1"/);
  assert.doesNotMatch(source, /ignoreDuplicates\s*:\s*true/);
  assert.match(source, /freshness_promotions !== 0 \|\| stats\.detail_fetches !== 0/);
});

test("Common Crawl observation RPC advances CDX evidence without mutating freshness on existing rows", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260831090000_commoncrawl_observation_refresh_v1.sql"),
    "utf8",
  );

  assert.match(migration, /first_observed_at = least\(s\.first_observed_at, r\.first_observed_at\)/);
  assert.match(migration, /last_observed_at = greatest\(s\.last_observed_at, r\.last_observed_at\)/);
  assert.match(migration, /p\.no_bypass_required is true/);
  assert.match(migration, /'commoncrawl' = any\(p\.allowed_discovery_channels\)/);

  const updateStart = migration.indexOf("update public.source_offer_seeds s\n    set");
  const updateEnd = migration.indexOf("where s.id = v_existing.id;", updateStart);
  assert.ok(updateStart >= 0 && updateEnd > updateStart, "existing-row update block must exist");
  const updateBlock = migration.slice(updateStart, updateEnd);
  assert.doesNotMatch(updateBlock, /freshness_status/);
  assert.doesNotMatch(updateBlock, /fresh_last_seen_at/);
  assert.doesNotMatch(updateBlock, /fresh_channels/);
});
