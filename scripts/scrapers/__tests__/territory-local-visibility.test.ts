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

  assert.equal(shallow.landmarks.length, 0);
  assert.deepEqual(deep.landmarks.map((entry) => entry.entity.id), [
    "landmark_casablanca_finance_city_cfc_tower",
  ]);
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
