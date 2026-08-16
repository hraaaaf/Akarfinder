import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry";
import { NEIGHBORHOOD_CENTROIDS } from "../../../lib/geo/morocco-centroids";
import {
  RABAT_ADMIN_PARENTS,
  RABAT_CERTIFIED_PRODUCT_LOCALITIES,
  RABAT_PRODUCT_LOCALITY_CANDIDATES,
  getRabatMapEligibleLocalities,
} from "../../../lib/geo/rabat-locality-registry";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

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

test("C8B point proxies are backed only by existing neighborhood centroids", () => {
  const pointProxyNames = new Set(["Agdal", "Hay Riad", "Hassan"]);

  for (const locality of RABAT_CERTIFIED_PRODUCT_LOCALITIES) {
    if (pointProxyNames.has(locality.display_name)) {
      const key = `rabat::${locality.normalized_name}`;
      assert.ok(NEIGHBORHOOD_CENTROIDS[key], `${key} must have an existing point proxy`);
      assert.equal(locality.geometry_status, "point_proxy");
      assert.equal(locality.geometry_source, "akarfinder_morocco_centroids_v1");
      continue;
    }

    assert.equal(locality.geometry_status, "unresolved");
    assert.equal(locality.geometry_source, null);
    assert.equal(locality.geometry_version, null);
  }
});

test("C8B admin parents are separate authority records and all references resolve", () => {
  const parentIds = new Set(RABAT_ADMIN_PARENTS.map((parent) => parent.id));
  assert.equal(parentIds.size, RABAT_ADMIN_PARENTS.length);
  assert.ok(parentIds.has("admin_rabat_agdal_riyad"));
  assert.ok(parentIds.has("admin_rabat_hassan"));
  assert.ok(parentIds.has("admin_rabat_souissi"));
  assert.ok(parentIds.has("admin_rabat_yacoub_el_mansour"));
  assert.ok(parentIds.has("admin_rabat_youssoufia"));
  assert.ok(parentIds.has("admin_rabat_touarga"));

  for (const locality of [...RABAT_CERTIFIED_PRODUCT_LOCALITIES, ...RABAT_PRODUCT_LOCALITY_CANDIDATES]) {
    if (locality.admin_parent_id) {
      assert.ok(parentIds.has(locality.admin_parent_id), `${locality.id} has an unknown admin parent`);
    }
  }
});

test("C8B candidates fail closed and never become map eligible by naming alone", () => {
  assert.deepEqual(
    RABAT_PRODUCT_LOCALITY_CANDIDATES.map((candidate) => candidate.id),
    [
      "candidate_rabat_yacoub_el_mansour",
      "candidate_rabat_youssoufia",
      "candidate_rabat_touarga",
    ],
  );

  for (const candidate of RABAT_PRODUCT_LOCALITY_CANDIDATES) {
    assert.equal(candidate.taxonomy_status, "candidate");
    assert.equal(candidate.market_map_eligible, false);
    assert.equal(candidate.geometry_status, "unresolved");
    assert.equal(candidate.geometry_source, null);
  }
});

test("C8B does not expand the existing runtime map-eligible set", () => {
  assert.deepEqual(
    getRabatMapEligibleLocalities().map((locality) => locality.id),
    ["district_rabat_agdal", "district_rabat_hay_riad", "district_rabat_hassan"],
  );

  const resolver = read("lib/geo/resolve-listing-geo.ts");
  const marketApi = read("app/api/geo/rabat-market-intelligence/route.ts");
  assert.ok(!resolver.includes("rabat-locality-registry"));
  assert.ok(!marketApi.includes("rabat-locality-registry"));
});
