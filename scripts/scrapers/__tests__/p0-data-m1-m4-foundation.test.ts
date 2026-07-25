// AKARFINDER P0 DATA M1-M4 — static certification gates.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { GEO_CITIES, GEO_NEIGHBORHOODS, normalizeGeoText } from "../../../lib/geo/geo-entity-registry";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260725150000_create_p0_data_geography_intelligence_price_publication.sql"),
  "utf8",
);

const activeSql = migration.split(/--\s*ROLLBACK/i)[0];

describe("P0 DATA M1-M4 migration safety", () => {
  it("is additive and never mutates legacy property_listings", () => {
    assert.doesNotMatch(activeSql, /\bdrop\s+table\b/i);
    assert.doesNotMatch(activeSql, /\btruncate\b/i);
    assert.doesNotMatch(activeSql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(activeSql, /alter\s+table\s+(?:public\.)?property_listings/i);
  });

  it("creates every canonical mission surface", () => {
    for (const table of [
      "geo_entities",
      "geo_aliases",
      "geo_resolution_events",
      "neighborhood_intelligence_profiles",
      "price_m2_references",
      "data_publication_batches",
      "data_publication_items",
    ]) {
      assert.match(activeSql, new RegExp(`create table if not exists public\\.${table}`, "i"));
      assert.match(activeSql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    }
  });

  it("publishes only reviewed neighborhood profiles and usable price references", () => {
    assert.match(activeSql, /where p\.status = 'published'/i);
    assert.match(activeSql, /quality_status in \('provisional','reliable'\)/i);
  });

  it("documents objective, preconditions, impact, rerun and rollback", () => {
    const header = migration.split("\n").slice(0, 12).join("\n");
    for (const marker of ["Objective", "Preconditions", "Impact", "Re-run behavior", "Rollback"]) {
      assert.match(header, new RegExp(marker, "i"));
    }
    assert.match(migration, /--\s*ROLLBACK/i);
  });
});

describe("P0 DATA M1 registry import readiness", () => {
  it("has stable unique ids and slugs", () => {
    const ids = [...GEO_CITIES, ...GEO_NEIGHBORHOODS].map((entity) => entity.id);
    assert.equal(new Set(ids).size, ids.length);

    const citySlugs = GEO_CITIES.map((city) => city.slug);
    assert.equal(new Set(citySlugs).size, citySlugs.length);

    const districtKeys = GEO_NEIGHBORHOODS.map((district) => `${district.city_slug}:${district.slug}`);
    assert.equal(new Set(districtKeys).size, districtKeys.length);
  });

  it("has no alias collision inside the same geographic scope", () => {
    const cityNames = new Map<string, string>();
    for (const city of GEO_CITIES) {
      for (const candidate of [city.canonical_name, city.slug, ...city.aliases]) {
        const key = normalizeGeoText(candidate);
        const previous = cityNames.get(key);
        assert.ok(!previous || previous === city.id, `city alias collision: ${candidate}`);
        cityNames.set(key, city.id);
      }
    }

    const districtNames = new Map<string, string>();
    for (const district of GEO_NEIGHBORHOODS) {
      for (const candidate of [district.canonical_name, district.slug, ...district.aliases]) {
        const key = `${district.city_slug}:${normalizeGeoText(candidate)}`;
        const previous = districtNames.get(key);
        assert.ok(!previous || previous === district.id, `district alias collision: ${candidate}`);
        districtNames.set(key, district.id);
      }
    }
  });
});
