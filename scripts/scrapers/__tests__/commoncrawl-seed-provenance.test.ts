import assert from "node:assert/strict";
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
