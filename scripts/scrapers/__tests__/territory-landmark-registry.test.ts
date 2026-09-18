import assert from "node:assert/strict";
import test from "node:test";

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

test("verified registry covers the certified city/district paths", () => {
  assert.deepEqual(
    VERIFIED_LANDMARKS.map(({ entity }) => [entity.citySlug, entity.districtSlug]).sort(),
    [
      ["agadir", "founty"],
      ["agadir", "talborjt"],
      ["casablanca", "ain-diab"],
      ["casablanca", "bourgogne"],
      ["casablanca", "bouskoura"],
      ["casablanca", "finance-city"],
      ["casablanca", "maarif"],
      ["casablanca", "racine"],
      ["fes", "fes-el-bali"],
      ["fes", "ville-nouvelle"],
      ["kenitra", "centre-ville"],
      ["marrakech", "gueliz"],
      ["marrakech", "hivernage"],
      ["marrakech", "route-de-lourika"],
      ["mohammedia", "centre"],
      ["rabat", "agdal"],
      ["rabat", "hassan"],
      ["rabat", "hay-riad"],
      ["rabat", "souissi"],
      ["rabat", "ocean"],
      ["tanger", "malabata"],
      ["tanger", "marchan"],
      ["tanger", "ville-nouvelle"],
    ].sort(),
  );
});

test("district lookup never leaks landmarks from another district", () => {
  const agdal = getVerifiedLandmarksForDistrict("district_rabat_agdal");
  assert.equal(agdal.length, 1);
  assert.equal(agdal[0]?.entity.id, "landmark_rabat_agdal_station");

  const maarif = getVerifiedLandmarksForDistrict("district_casablanca_maarif");
  assert.equal(maarif.length, 1);
  assert.equal(maarif[0]?.entity.id, "landmark_casablanca_maarif_twin_center");
  assert.deepEqual(getVerifiedLandmarksForDistrict("district_missing"), []);
});
