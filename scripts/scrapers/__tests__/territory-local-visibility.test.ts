import assert from "node:assert/strict";
import test from "node:test";

import { selectLocalTerritoryVisibility } from "../../../lib/geo/territory-local-visibility";

test("LOT6 early city zoom shows flagship districts before landmarks", () => {
  const result = selectLocalTerritoryVisibility({
    citySlug: "casablanca",
    zoom: 9.5,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 6,
  });

  assert.deepEqual(result.districts.map((district) => district.id), [
    "district_casablanca_maarif",
  ]);
  assert.deepEqual(result.landmarks, []);
});

test("deep zoom reveals a verified landmark only after its parent district is visible", () => {
  const shallow = selectLocalTerritoryVisibility({
    citySlug: "casablanca",
    zoom: 13.7,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 6,
  });
  const deep = selectLocalTerritoryVisibility({
    citySlug: "casablanca",
    zoom: 14,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 6,
  });

  assert.ok(shallow.landmarks.length > 0);
  assert.ok(shallow.landmarks.length <= 6);
  const shallowDistrictIds = new Set(shallow.districts.map((district) => district.id));
  assert.ok(shallow.landmarks.every((entry) => shallowDistrictIds.has(entry.entity.parentId)));

  assert.ok(!shallow.landmarks.some((entry) => entry.entity.id === "landmark_casablanca_finance_city_cfc_tower"));
  assert.ok(deep.landmarks.some((entry) => entry.entity.id === "landmark_casablanca_finance_city_cfc_tower"));
  assert.ok(deep.landmarks.some((entry) => entry.entity.id === "landmark_casablanca_ain_diab_morocco_mall"));
  assert.ok(deep.landmarks.some((entry) => entry.entity.id === "landmark_casablanca_maarif_twin_center"));
  const deepDistrictIds = new Set(deep.districts.map((district) => district.id));
  assert.ok(deep.landmarks.every((entry) => deepDistrictIds.has(entry.entity.parentId)));
});

test("Rabat and Marrakech expose their verified flagship anchors at deep zoom", () => {
  const rabat = selectLocalTerritoryVisibility({
    citySlug: "rabat",
    zoom: 14,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 6,
  });
  const marrakech = selectLocalTerritoryVisibility({
    citySlug: "marrakech",
    zoom: 14,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 6,
  });

  assert.ok(rabat.landmarks.some((entry) => entry.entity.id === "landmark_rabat_agdal_station"));
  assert.ok(marrakech.landmarks.some((entry) => entry.entity.id === "landmark_marrakech_hivernage_menara_mall"));
});

test("label capacities fail closed without cross-city leakage", () => {
  const noDistrictCapacity = selectLocalTerritoryVisibility({
    citySlug: "rabat",
    zoom: 14,
    maxDistrictLabels: 0,
    maxLandmarkLabels: 6,
  });
  assert.deepEqual(noDistrictCapacity, { districts: [], landmarks: [] });

  const noLandmarks = selectLocalTerritoryVisibility({
    citySlug: "rabat",
    zoom: 14,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 0,
  });
  assert.ok(noLandmarks.districts.length > 0);
  assert.deepEqual(noLandmarks.landmarks, []);
});


test("theme diversity suppresses same-theme district duplicates at overview zoom and releases them deeper", () => {
  const overview = selectLocalTerritoryVisibility({
    citySlug: "rabat",
    zoom: 14,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 20,
  });
  const deep = selectLocalTerritoryVisibility({
    citySlug: "rabat",
    zoom: 15,
    maxDistrictLabels: 6,
    maxLandmarkLabels: 20,
  });

  const hassanIdsAtOverview = overview.landmarks
    .filter(({ entity }) => entity.parentId === "district_rabat_hassan")
    .map(({ entity }) => entity.id);
  const hassanIdsDeep = deep.landmarks
    .filter(({ entity }) => entity.parentId === "district_rabat_hassan")
    .map(({ entity }) => entity.id);

  assert.ok(hassanIdsAtOverview.includes("landmark_rabat_hassan_tour_hassan"));
  assert.ok(!hassanIdsAtOverview.includes("landmark_rabat_hassan_mausolee_mohammed_v"));
  assert.ok(hassanIdsDeep.includes("landmark_rabat_hassan_tour_hassan"));
  assert.ok(hassanIdsDeep.includes("landmark_rabat_hassan_mausolee_mohammed_v"));
});
