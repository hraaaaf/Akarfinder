import assert from "node:assert/strict";
import test from "node:test";

import {
  compareTerritoryPriority,
  isTerritoryVisibleAtZoom,
  validateTerritoryDictionary,
  type TerritoryDictionary,
  type TerritoryEntity,
} from "../../../lib/geo/territory-dictionary";

const fixture: TerritoryDictionary = [
  {
    id: "city_casablanca",
    type: "city",
    citySlug: "casablanca",
    canonicalName: "Casablanca",
    aliases: ["Casa"],
    parentId: null,
    importance: { score: 100, tier: "flagship", basis: ["product_priority", "urban_prominence"] },
    visibility: { minZoom: 4, retainPriority: true },
    coordinates: { lat: 33.5731, lng: -7.5898, precision: "city_centroid" },
  },
  {
    id: "city_rabat",
    type: "city",
    citySlug: "rabat",
    canonicalName: "Rabat",
    aliases: [],
    parentId: null,
    importance: { score: 95, tier: "flagship", basis: ["product_priority", "urban_prominence"] },
    visibility: { minZoom: 4, retainPriority: true },
    coordinates: { lat: 34.0209, lng: -6.8416, precision: "city_centroid" },
  },
  {
    id: "city_marrakech",
    type: "city",
    citySlug: "marrakech",
    canonicalName: "Marrakech",
    aliases: ["Marrakesh"],
    parentId: null,
    importance: { score: 94, tier: "flagship", basis: ["product_priority", "urban_prominence"] },
    visibility: { minZoom: 4, retainPriority: true },
    coordinates: { lat: 31.6295, lng: -7.9811, precision: "city_centroid" },
  },
  {
    id: "district_casablanca_maarif",
    type: "district",
    citySlug: "casablanca",
    districtSlug: "maarif",
    canonicalName: "Maârif",
    aliases: ["Maarif"],
    parentId: "city_casablanca",
    importance: { score: 90, tier: "major", basis: ["product_priority", "orientation_value"] },
    visibility: { minZoom: 10, retainPriority: true },
    coordinates: { lat: 33.5839, lng: -7.629, precision: "neighborhood_centroid" },
  },
  {
    id: "district_rabat_agdal",
    type: "district",
    citySlug: "rabat",
    districtSlug: "agdal",
    canonicalName: "Agdal",
    aliases: [],
    parentId: "city_rabat",
    importance: { score: 90, tier: "major", basis: ["product_priority", "orientation_value"] },
    visibility: { minZoom: 10, retainPriority: true },
    coordinates: { lat: 33.9897, lng: -6.8541, precision: "neighborhood_centroid" },
  },
  {
    id: "district_marrakech_gueliz",
    type: "district",
    citySlug: "marrakech",
    districtSlug: "gueliz",
    canonicalName: "Guéliz",
    aliases: ["Gueliz"],
    parentId: "city_marrakech",
    importance: { score: 90, tier: "major", basis: ["product_priority", "orientation_value"] },
    visibility: { minZoom: 10, retainPriority: true },
    coordinates: { lat: 31.634, lng: -8.004, precision: "neighborhood_centroid" },
  },
];

test("LOT1 fixture validates Casablanca, Rabat and Marrakech hierarchy", () => {
  assert.deepEqual(validateTerritoryDictionary(fixture), []);
  assert.equal(fixture.filter((entity) => entity.type === "city").length, 3);
  assert.equal(fixture.filter((entity) => entity.type === "district").length, 3);
});

test("zoom policy reveals cities before districts", () => {
  const casablanca = fixture.find((entity) => entity.id === "city_casablanca")!;
  const maarif = fixture.find((entity) => entity.id === "district_casablanca_maarif")!;

  assert.equal(isTerritoryVisibleAtZoom(casablanca, 5), true);
  assert.equal(isTerritoryVisibleAtZoom(maarif, 5), false);
  assert.equal(isTerritoryVisibleAtZoom(maarif, 11), true);
});

test("priority ordering keeps flagship territories ahead", () => {
  const sorted = [...fixture].sort(compareTerritoryPriority);
  assert.equal(sorted[0]?.id, "city_casablanca");
  assert.ok(sorted.indexOf(fixture[0]!) < sorted.indexOf(fixture[3]!));
});

test("landmarks require district parent and verified point precision", () => {
  const badLandmark: TerritoryEntity = {
    id: "landmark_fixture",
    type: "landmark",
    citySlug: "casablanca",
    districtSlug: "maarif",
    landmarkSlug: "fixture",
    canonicalName: "Fixture landmark",
    aliases: [],
    category: "other",
    parentId: "district_missing",
    importance: { score: 50, tier: "local", basis: ["orientation_value"] },
    visibility: { minZoom: 14, retainPriority: false },
    coordinates: { lat: 33.58, lng: -7.62, precision: "verified_landmark_point" },
  };

  const issues = validateTerritoryDictionary([...fixture, badLandmark]);
  assert.ok(issues.some((issue) => issue.entityId === "landmark_fixture" && issue.field === "parentId"));
});

test("duplicate ids are rejected", () => {
  const issues = validateTerritoryDictionary([...fixture, fixture[0]!]);
  assert.ok(issues.some((issue) => issue.field === "id" && issue.message.includes("duplicate")));
});
