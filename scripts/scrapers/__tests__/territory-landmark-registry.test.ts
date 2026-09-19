import assert from "node:assert/strict";
import test from "node:test";

import { GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry";
import {
  VERIFIED_LANDMARKS,
  getVerifiedLandmarksForDistrict,
} from "../../../lib/geo/territory-landmark-registry";
import { validateTerritoryEntity } from "../../../lib/geo/territory-dictionary";
import { scoreLandmarkNotoriety } from "../../../lib/geo/territory-landmark-notoriety";
import { getLandmarkPresentation, selectLandmarksForCityView } from "../../../lib/geo/territory-landmark-presentation";
import { layoutLandmarkCards } from "../../../lib/geo/territory-landmark-layout";

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

test("Mohammedia twin-cities park resolves to its dedicated signage artwork", () => {
  const entry = VERIFIED_LANDMARKS.find(
    (candidate) => candidate.entity.id === "landmark_mohammedia_centre_parc_villes_jumelees",
  );
  assert.ok(entry);
  assert.equal(getLandmarkPresentation(entry).artworkKey, "parc-des-villes-jumelees");
  assert.equal(getLandmarkPresentation(entry).tierLabel, "Majeur");
});

test("Ain Diab Sindibad resolves to dedicated signage artwork", () => {
  const entry = VERIFIED_LANDMARKS.find(
    (candidate) => candidate.entity.id === "landmark_casablanca_ain_diab_parc_sindibad",
  );
  assert.ok(entry);
  assert.equal(getLandmarkPresentation(entry).artworkKey, "parc-sindibad");
  assert.equal(getLandmarkPresentation(entry).tierLabel, "Majeur");
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


test("Casablanca TARGET exposes the approved visual hierarchy", () => {
  const byId = new Map(VERIFIED_LANDMARKS.map((entry) => [entry.entity.id, entry]));
  const expected = new Map([
    ["landmark_casablanca_maarif_twin_center", "Iconique"],
    ["landmark_casablanca_maarif_stade_mohammed_v", "Iconique"],
    ["landmark_casablanca_ain_diab_morocco_mall", "Majeur"],
    ["landmark_casablanca_finance_city_cfc_tower", "Majeur"],
    ["landmark_casablanca_finance_city_anfa_park", "Majeur"],
    ["landmark_casablanca_bourgogne_lycee_lyautey", "Local fort"],
    ["landmark_casablanca_racine_institut_juan_ramon_jimenez", "Local fort"],
    ["landmark_casablanca_bouskoura_forest", "Local fort"],
  ]);

  for (const [id, tierLabel] of expected) {
    const entry = byId.get(id);
    assert.ok(entry, id);
    assert.equal(getLandmarkPresentation(entry).tierLabel, tierLabel, id);
  }
});

test("Casablanca landmark reveal is progressive and capacity-bounded", () => {
  const casa = VERIFIED_LANDMARKS.filter((entry) => entry.entity.citySlug === "casablanca");
  const early = selectLandmarksForCityView(casa, 10.4, 1280);
  const medium = selectLandmarksForCityView(casa, 10.9, 1280);
  const deep = selectLandmarksForCityView(casa, 11.4, 1280);

  assert.ok(early.length <= 4);
  assert.ok(medium.length >= early.length && medium.length <= 5);
  assert.ok(deep.length >= medium.length && deep.length <= 8);
  assert.ok(early.some((entry) => entry.entity.id === "landmark_casablanca_maarif_twin_center"));
  assert.ok(early.some((entry) => entry.entity.id === "landmark_casablanca_maarif_stade_mohammed_v"));
  assert.ok(!early.some((entry) => entry.entity.id === "landmark_casablanca_bourgogne_casa_bourgogne_post"));
});

test("landmark card layout rejects overlaps and reserved UI zones", () => {
  const casa = VERIFIED_LANDMARKS.filter((entry) => entry.entity.citySlug === "casablanca");
  const anchors = selectLandmarksForCityView(casa, 11.4, 1280).map((entry, index) => ({
    entry,
    x: 360 + (index % 4) * 120,
    y: 250 + Math.floor(index / 4) * 130,
  }));
  const reserved = [{ x: 890, y: 0, width: 390, height: 900 }];
  const placed = layoutLandmarkCards({
    anchors,
    viewportWidth: 1280,
    viewportHeight: 900,
    reserved,
  });

  for (let i = 0; i < placed.length; i += 1) {
    const a = placed[i];
    assert.ok(a.cardX + a.width <= 882);
    for (let j = i + 1; j < placed.length; j += 1) {
      const b = placed[j];
      const overlap = !(
        a.cardX + a.width + 8 <= b.cardX ||
        b.cardX + b.width + 8 <= a.cardX ||
        a.cardY + a.height + 8 <= b.cardY ||
        b.cardY + b.height + 8 <= a.cardY
      );
      assert.equal(overlap, false, `${a.entry.entity.id} overlaps ${b.entry.entity.id}`);
    }
  }
});


test("landmark card displacement stays visually tethered to its GPS pin", () => {
  const casa = VERIFIED_LANDMARKS.filter((entry) => entry.entity.citySlug === "casablanca");
  const anchors = selectLandmarksForCityView(casa, 11.4, 1280).map((entry, index) => ({
    entry,
    x: 240 + (index % 4) * 170,
    y: 220 + Math.floor(index / 4) * 150,
  }));
  const placed = layoutLandmarkCards({
    anchors,
    viewportWidth: 1280,
    viewportHeight: 900,
    reserved: [{ x: 892, y: 0, width: 388, height: 900 }],
  });

  for (const item of placed) {
    const nearestX = Math.max(item.cardX, Math.min(item.cardX + item.width, item.x));
    const nearestY = Math.max(item.cardY, Math.min(item.cardY + item.height, item.y));
    const distance = Math.hypot(nearestX - item.x, nearestY - item.y);
    assert.ok(distance <= 20, `${item.entry.entity.id} displaced ${distance.toFixed(1)}px`);
  }
});


test("nearby landmark pins suppress the lower-priority card until zoom separates them", () => {
  const twin = VERIFIED_LANDMARKS.find((entry) => entry.entity.id === "landmark_casablanca_maarif_twin_center");
  const stade = VERIFIED_LANDMARKS.find((entry) => entry.entity.id === "landmark_casablanca_maarif_stade_mohammed_v");
  assert.ok(twin);
  assert.ok(stade);

  const crowded = layoutLandmarkCards({
    anchors: [
      { entry: twin, x: 500, y: 360 },
      { entry: stade, x: 565, y: 386 },
    ],
    viewportWidth: 1280,
    viewportHeight: 900,
  });
  assert.equal(crowded.length, 1);
  assert.equal(crowded[0].entry.entity.id, twin.entity.id);

  const separated = layoutLandmarkCards({
    anchors: [
      { entry: twin, x: 430, y: 330 },
      { entry: stade, x: 590, y: 410 },
    ],
    viewportWidth: 1280,
    viewportHeight: 900,
  });
  assert.equal(separated.length, 2);
});


test("Casablanca signage TARGET uses eight dedicated non-generic artworks", () => {
  const expected = new Map([
    ["landmark_casablanca_maarif_twin_center", "twin-center"],
    ["landmark_casablanca_maarif_stade_mohammed_v", "stade-mohammed-v"],
    ["landmark_casablanca_ain_diab_morocco_mall", "morocco-mall"],
    ["landmark_casablanca_finance_city_cfc_tower", "cfc-first-tower"],
    ["landmark_casablanca_finance_city_anfa_park", "anfa-park"],
    ["landmark_casablanca_bourgogne_lycee_lyautey", "lycee-lyautey"],
    ["landmark_casablanca_racine_institut_juan_ramon_jimenez", "institut-juan-ramon-jimenez"],
    ["landmark_casablanca_bouskoura_forest", "foret-de-bouskoura"],
  ]);

  const resolved = new Set<string>();
  for (const [id, artworkKey] of expected) {
    const entry = VERIFIED_LANDMARKS.find((candidate) => candidate.entity.id === id);
    assert.ok(entry, id);
    assert.equal(getLandmarkPresentation(entry).artworkKey, artworkKey, id);
    resolved.add(artworkKey);
  }

  assert.equal(resolved.size, 8, "TARGET artworks must remain visually distinct");
});
