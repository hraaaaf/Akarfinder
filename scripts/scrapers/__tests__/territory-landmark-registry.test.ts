import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import { GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry";
import {
  VERIFIED_LANDMARKS,
  getVerifiedLandmarksForDistrict,
} from "../../../lib/geo/territory-landmark-registry";
import { validateTerritoryEntity } from "../../../lib/geo/territory-dictionary";

const districtIds = new Set(GEO_NEIGHBORHOODS.map((district) => district.id));

test("LOT4 seed landmarks only reference canonical districts", () => {
  for (const { entity } of VERIFIED_LANDMARKS) {
    assert.ok(districtIds.has(entity.parentId), entity.id);
  }
});

test("every verified landmark has a validated point and at least two evidence refs", () => {
  for (const entry of VERIFIED_LANDMARKS) {
    assert.equal(entry.entity.coordinates?.precision, "verified_landmark_point");
    assert.ok(entry.sourceRefs.length >= 2, entry.entity.id);
    assert.deepEqual(validateTerritoryEntity(entry.entity), []);
  }
});

test("verified registry paths always match their canonical district parent", () => {
  const districtById = new Map(GEO_NEIGHBORHOODS.map((district) => [district.id, district]));
  for (const { entity } of VERIFIED_LANDMARKS) {
    const parent = districtById.get(entity.parentId);
    assert.ok(parent, entity.id);
    assert.equal(entity.citySlug, parent.city_slug, entity.id);
    assert.equal(entity.districtSlug, parent.slug, entity.id);
  }
});

test("district lookup never leaks landmarks from another district", () => {
  const agdal = getVerifiedLandmarksForDistrict("district_rabat_agdal");
  assert.equal(agdal.length, 1);
  assert.equal(agdal[0]?.entity.id, "landmark_rabat_agdal_station");

  const maarif = getVerifiedLandmarksForDistrict("district_casablanca_maarif");
  assert.equal(maarif.length, 2);
  assert.deepEqual(
    maarif.map(({ entity }) => [entity.id, entity.importance.score]),
    [
      ["landmark_casablanca_maarif_stade_mohammed_v", 99],
      ["landmark_casablanca_maarif_twin_center", 98],
    ],
  );
  assert.deepEqual(
    maarif[0]?.entity.coordinates,
    { lat: 33.58285065, lng: -7.6468283, precision: "verified_landmark_point" },
  );
  assert.equal(
    fs.existsSync("public/landmarks/casablanca-maarif-stade-mohammed-v.svg"),
    true,
  );
  assert.deepEqual(getVerifiedLandmarksForDistrict("district_missing"), []);
});
