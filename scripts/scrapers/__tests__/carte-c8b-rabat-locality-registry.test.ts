import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { MOROCCO_DISTRICTS } from "../../../lib/geo/district-dictionary";
import { GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry";
import { NEIGHBORHOOD_CENTROIDS } from "../../../lib/geo/morocco-centroids";
import {
  RABAT_ADMIN_PARENTS,
  RABAT_ALL_PRODUCT_LOCALITIES,
  RABAT_CERTIFIED_PRODUCT_LOCALITIES,
  RABAT_PRODUCT_LOCALITY_CANDIDATES,
  getRabatMapEligibleLocalities,
} from "../../../lib/geo/rabat-locality-registry";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

test("C8B mirrors the five existing Rabat canonical product entities losslessly", () => {
  const legacy = GEO_NEIGHBORHOODS.filter((entry) => entry.city_slug === "rabat");
  assert.equal(legacy.length, 5);
  assert.equal(RABAT_CERTIFIED_PRODUCT_LOCALITIES.length, 5);
  for (const locality of RABAT_CERTIFIED_PRODUCT_LOCALITIES) {
    const previous = legacy.find((entry) => entry.id === locality.id);
    assert.ok(previous, `${locality.id} must exist in the C0-C7 registry`);
    assert.equal(locality.display_name, previous.canonical_name);
    assert.deepEqual(locality.aliases, previous.aliases);
    assert.equal(locality.market_map_eligible, previous.map_eligible);
    assert.equal(locality.taxonomy_status, "certified");
  }
});

test("C8B covers every current Rabat district-dictionary name without silent loss", () => {
  const registryNames = new Set<string>();
  for (const locality of RABAT_ALL_PRODUCT_LOCALITIES) {
    registryNames.add(normalize(locality.display_name));
    for (const alias of locality.aliases) registryNames.add(normalize(alias));
  }
  const missing = MOROCCO_DISTRICTS.Rabat.filter((name) => !registryNames.has(normalize(name)));
  assert.deepEqual(missing, []);
  assert.equal(MOROCCO_DISTRICTS.Rabat.length, 10);
});

test("C8B IDs and slugs are unique and non-empty", () => {
  const ids = RABAT_ALL_PRODUCT_LOCALITIES.map((entry) => entry.id);
  const slugs = RABAT_ALL_PRODUCT_LOCALITIES.map((entry) => entry.slug);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(RABAT_ALL_PRODUCT_LOCALITIES.every((entry) => entry.slug.length > 0));
});

test("C8B point proxies are backed only by existing neighborhood centroids", () => {
  const pointProxyNames = new Set(["Agdal", "Hay Riad", "Hassan"]);
  for (const locality of RABAT_CERTIFIED_PRODUCT_LOCALITIES) {
    if (pointProxyNames.has(locality.display_name)) {
      const key = `rabat::${locality.normalized_name}`;
      assert.ok(NEIGHBORHOOD_CENTROIDS[key], `${key} must have an existing point proxy`);
      assert.equal(locality.geometry_status, "point_proxy");
      assert.equal(locality.geometry_source, "akarfinder_morocco_centroids_v1");
    } else {
      assert.equal(locality.geometry_status, "unresolved");
      assert.equal(locality.geometry_source, null);
      assert.equal(locality.activation_status, "blocked");
      assert.equal(locality.fail_closed_reason, "geometry_unresolved");
    }
  }
});

test("C8B admin parents are separate authority records and all references resolve", () => {
  const parentIds = new Set(RABAT_ADMIN_PARENTS.map((parent) => parent.id));
  assert.equal(parentIds.size, RABAT_ADMIN_PARENTS.length);
  for (const locality of RABAT_ALL_PRODUCT_LOCALITIES) {
    if (locality.admin_parent_id) assert.ok(parentIds.has(locality.admin_parent_id), `${locality.id} has an unknown admin parent`);
  }
});

test("C8B promotes only the source-backed batch and keeps all provisional entries fail-closed", () => {
  assert.equal(RABAT_PRODUCT_LOCALITY_CANDIDATES.length, 18);
  const promoted = RABAT_PRODUCT_LOCALITY_CANDIDATES.filter((entry) => entry.taxonomy_status === "certified");
  assert.deepEqual(promoted.map((entry) => entry.id).sort(), ["candidate_rabat_akkari", "candidate_rabat_al_boustane"].sort());

  for (const entry of RABAT_PRODUCT_LOCALITY_CANDIDATES) {
    assert.equal(entry.market_map_eligible, false);
    assert.equal(entry.geometry_status, "unresolved");
    assert.equal(entry.geometry_source, null);
    assert.equal(entry.activation_status, "blocked");
    assert.equal(entry.fail_closed_reason, entry.taxonomy_status === "certified" ? "geometry_unresolved" : "taxonomy_candidate");
  }
});

test("C8B does not expand the existing runtime map-eligible set", () => {
  assert.deepEqual(getRabatMapEligibleLocalities().map((locality) => locality.id), ["district_rabat_agdal", "district_rabat_hay_riad", "district_rabat_hassan"]);
  const resolver = read("lib/geo/resolve-listing-geo.ts");
  const marketApi = read("app/api/geo/rabat-market-intelligence/route.ts");
  assert.ok(!resolver.includes("rabat-locality-registry"));
  assert.ok(!marketApi.includes("rabat-locality-registry"));
});
