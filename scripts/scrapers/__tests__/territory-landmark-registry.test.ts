import assert from "node:assert/strict";
import test from "node:test";

import { GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry";
import {
  VERIFIED_LANDMARKS,
  getVerifiedLandmarksForDistrict,
} from "../../../lib/geo/territory-landmark-registry";
import { validateTerritoryEntity } from "../../../lib/geo/territory-dictionary";
import { scoreLandmarkNotoriety } from "../../../lib/geo/territory-landmark-notoriety";

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
    Array.from(new Set(VERIFIED_LANDMARKS.map(({ entity }) => `${entity.citySlug}::${entity.districtSlug}`)))
      .map((value) => value.split("::"))
      .sort(),
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
  assert.equal(agdal.length, 2);
  assert.ok(agdal.some(({ entity }) => entity.id === "landmark_rabat_agdal_station"));
  assert.ok(agdal.some(({ entity }) => entity.id === "landmark_rabat_agdal_bnrm"));

  const maarif = getVerifiedLandmarksForDistrict("district_casablanca_maarif");
  assert.equal(maarif.length, 2);
  assert.ok(maarif.some(({ entity }) => entity.id === "landmark_casablanca_maarif_twin_center"));
  assert.ok(maarif.some(({ entity }) => entity.id === "landmark_casablanca_maarif_stade_mohammed_v"));
  assert.deepEqual(getVerifiedLandmarksForDistrict("district_missing"), []);
});


test("bootstrap seed establishes a substantial landmark baseline", () => {
  assert.ok(VERIFIED_LANDMARKS.length >= 37, `expected >=37 verified landmarks, got ${VERIFIED_LANDMARKS.length}`);
  assert.equal(new Set(VERIFIED_LANDMARKS.map(({ entity }) => entity.id)).size, VERIFIED_LANDMARKS.length);
});

test("landmark notoriety scoring applies confidence gate and weighted tiers", () => {
  assert.deepEqual(
    scoreLandmarkNotoriety({
      publicRecognition: 96,
      orientationValue: 94,
      visualSingularity: 90,
      confidence: 95,
    }),
    { score: 94, tier: "iconic", eligible: true, confidence: 95 },
  );

  assert.deepEqual(
    scoreLandmarkNotoriety({
      publicRecognition: 95,
      orientationValue: 95,
      visualSingularity: 95,
      confidence: 79,
    }),
    { score: 0, tier: "reject", eligible: false, confidence: 79 },
  );
});
