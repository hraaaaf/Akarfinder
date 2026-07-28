import assert from "node:assert/strict";
import test from "node:test";

import {
  geometryRegistryChangesRanking,
  normalizeGeometryAlias,
  resolveNeighborhoodGeometry,
  validateNeighborhoodGeometryRecord,
  type NeighborhoodGeometryRecord,
} from "../../../lib/geo/neighborhood-geometry-registry";
import {
  CASABLANCA_GEOMETRY_SOURCE_POLICY,
  listCasablancaShadowGeometries,
} from "../../../lib/geo/casablanca-neighborhood-geometry-shadow";

const validRecord: NeighborhoodGeometryRecord = {
  version: "v1",
  cityCanonicalId: "casablanca",
  neighborhoodCanonicalId: "maarif",
  displayName: "Maârif",
  aliases: ["Maarif", "المعاريف"],
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-7.64, 33.58],
      [-7.63, 33.58],
      [-7.63, 33.57],
      [-7.64, 33.58],
    ]],
  },
  source: {
    provider: "Fixture only",
    dataset: "Test fixture",
    sourceUrl: "https://example.test/source",
    licenseId: "TEST",
    licenseUrl: "https://example.test/license",
    attribution: "Test fixture",
    retrievedAt: "2026-07-28T00:00:00.000Z",
  },
  publicationStatus: "shadow",
  reviewed: false,
};

test("Casablanca geometry registry starts empty and shadow-only", () => {
  assert.deepEqual(listCasablancaShadowGeometries(), []);
  assert.equal(CASABLANCA_GEOMETRY_SOURCE_POLICY.usageMode, "shadow-only");
});

test("valid Polygon with provenance passes shadow validation", () => {
  assert.deepEqual(validateNeighborhoodGeometryRecord(validRecord), []);
});

test("unclosed or invalid rings are rejected", () => {
  const invalid = structuredClone(validRecord);
  invalid.geometry = {
    type: "Polygon",
    coordinates: [[
      [-7.64, 33.58],
      [-7.63, 33.58],
      [-7.63, 33.57],
      [-7.62, 33.57],
    ]],
  };
  assert.ok(validateNeighborhoodGeometryRecord(invalid).some((issue) => issue.code === "unclosed_ring"));
});

test("a geometry cannot leave Shadow without explicit review", () => {
  const canary = { ...validRecord, publicationStatus: "canary" as const };
  assert.ok(validateNeighborhoodGeometryRecord(canary).some((issue) => issue.code === "production_without_review"));
});

test("alias resolution is accent tolerant and refuses ambiguity", () => {
  assert.equal(normalizeGeometryAlias("Maârif"), "maarif");
  assert.equal(resolveNeighborhoodGeometry([validRecord], { cityCanonicalId: "casablanca", neighborhood: "Maarif" })?.neighborhoodCanonicalId, "maarif");
  assert.equal(resolveNeighborhoodGeometry([validRecord, { ...validRecord }], { cityCanonicalId: "casablanca", neighborhood: "Maarif" }), null);
});

test("geometry registry never changes Search ranking", () => {
  assert.equal(geometryRegistryChangesRanking(), false);
});
