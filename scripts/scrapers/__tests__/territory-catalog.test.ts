import assert from "node:assert/strict";
import test from "node:test";

import { createTerritoryCatalog } from "../../../lib/geo/territory-catalog";
import type { TerritoryDictionary } from "../../../lib/geo/territory-dictionary";

const extensibleFixture: TerritoryDictionary = [
  {
    id: "city_azrou",
    type: "city",
    citySlug: "azrou",
    canonicalName: "Azrou",
    aliases: [],
    parentId: null,
    importance: { score: 55, tier: "local", basis: ["product_priority"] },
    visibility: { minZoom: 7, retainPriority: false },
  },
  {
    id: "district_azrou_centre",
    type: "district",
    citySlug: "azrou",
    districtSlug: "centre",
    canonicalName: "Centre",
    aliases: [],
    parentId: "city_azrou",
    importance: { score: 80, tier: "major", basis: ["product_priority"] },
    visibility: { minZoom: 10, retainPriority: true },
  },
  {
    id: "landmark_azrou_centre_fixture",
    type: "landmark",
    citySlug: "azrou",
    districtSlug: "centre",
    landmarkSlug: "fixture",
    canonicalName: "Fixture",
    aliases: [],
    category: "other",
    parentId: "district_azrou_centre",
    importance: { score: 70, tier: "regional", basis: ["orientation_value"] },
    visibility: { minZoom: 14, retainPriority: false },
    coordinates: { lat: 33.43, lng: -5.22, precision: "verified_landmark_point" },
  },
];

test("LOT8 catalog accepts new district/landmark data without renderer logic", () => {
  const result = createTerritoryCatalog(extensibleFixture);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.catalog.byId.get("city_azrou")?.canonicalName, "Azrou");
  assert.deepEqual(
    result.catalog.getChildren("city_azrou", "district").map((entity) => entity.id),
    ["district_azrou_centre"],
  );
  assert.deepEqual(
    result.catalog.getChildren("district_azrou_centre", "landmark").map((entity) => entity.id),
    ["landmark_azrou_centre_fixture"],
  );
});

test("catalog preserves importance ordering for children", () => {
  const fixture: TerritoryDictionary = [
    extensibleFixture[0]!,
    {
      ...extensibleFixture[1]!,
      id: "district_azrou_secondary",
      districtSlug: "secondary",
      canonicalName: "Secondary",
      importance: { score: 40, tier: "local", basis: ["product_priority"] },
    },
    extensibleFixture[1]!,
  ];

  const result = createTerritoryCatalog(fixture);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(
    result.catalog.getChildren("city_azrou", "district").map((entity) => entity.id),
    ["district_azrou_centre", "district_azrou_secondary"],
  );
});

test("catalog fails closed when parentage is invalid", () => {
  const broken: TerritoryDictionary = [
    {
      ...extensibleFixture[1]!,
      parentId: "city_missing",
    },
  ];

  const result = createTerritoryCatalog(broken);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.field === "parentId"));
});
