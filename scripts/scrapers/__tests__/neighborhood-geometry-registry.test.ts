import assert from "node:assert/strict";
import test from "node:test";

import {
  geometryRegistryChangesRanking,
  normalizeGeometryAlias,
  resolveNeighborhoodGeometry,
  resolveNeighborhoodGeometryCandidate,
  validateNeighborhoodGeometryCandidateRecord,
  validateNeighborhoodGeometryRecord,
  type NeighborhoodGeometryRecord,
} from "../../../lib/geo/neighborhood-geometry-registry";
import {
  CASABLANCA_GEOMETRY_SOURCE_POLICY,
  listCasablancaShadowGeometries,
  listCasablancaShadowGeometryCandidates,
} from "../../../lib/geo/casablanca-neighborhood-geometry-shadow";

const validRecord: NeighborhoodGeometryRecord = {
  version: "v1",
  cityCanonicalId: "casablanca",
  neighborhoodCanonicalId: "maarif",
  displayName: "Maârif",
  aliases: ["Maarif", "المعاريف"],
  geometry: { type: "Polygon", coordinates: [[[-7.64, 33.58], [-7.63, 33.58], [-7.63, 33.57], [-7.64, 33.58]]] },
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

test("Casablanca Shadow contains 16 auditable relation candidates and no renderable geometry", () => {
  const candidates = listCasablancaShadowGeometryCandidates();
  assert.equal(candidates.length, 16);
  assert.equal(new Set(candidates.map((item) => item.sourceEntityId)).size, 16);
  assert.ok(candidates.every((item) => item.geometryStatus === "reference_only"));
  assert.ok(candidates.every((item) => item.publicationStatus === "shadow"));
  assert.deepEqual(listCasablancaShadowGeometries(), []);
  assert.equal(CASABLANCA_GEOMETRY_SOURCE_POLICY.usageMode, "shadow-only");
});

test("all Casablanca relation candidates have valid provenance and canonical identity", () => {
  for (const candidate of listCasablancaShadowGeometryCandidates()) {
    assert.deepEqual(validateNeighborhoodGeometryCandidateRecord(candidate), []);
    assert.match(candidate.source.sourceUrl, new RegExp(`/relation/${candidate.sourceEntityId}$`));
  }
});

test("candidate alias matching is accent tolerant and refuses ambiguity", () => {
  const candidates = listCasablancaShadowGeometryCandidates();
  assert.equal(normalizeGeometryAlias("Maârif"), "maarif");
  assert.equal(resolveNeighborhoodGeometryCandidate(candidates, { cityCanonicalId: "casablanca", neighborhood: "Maarif" })?.sourceEntityId, 2801474);
  assert.equal(resolveNeighborhoodGeometryCandidate([...candidates, { ...candidates[0] }], { cityCanonicalId: "casablanca", neighborhood: "Anfa" }), null);
});

test("valid Polygon with provenance passes shadow validation", () => {
  assert.deepEqual(validateNeighborhoodGeometryRecord(validRecord), []);
});

test("unclosed rings are rejected", () => {
  const invalid = structuredClone(validRecord);
  invalid.geometry = { type: "Polygon", coordinates: [[[-7.64, 33.58], [-7.63, 33.58], [-7.63, 33.57], [-7.62, 33.57]]] };
  assert.ok(validateNeighborhoodGeometryRecord(invalid).some((issue) => issue.code === "unclosed_ring"));
});

test("a geometry cannot leave Shadow without explicit review", () => {
  const canary = { ...validRecord, publicationStatus: "canary" as const };
  assert.ok(validateNeighborhoodGeometryRecord(canary).some((issue) => issue.code === "production_without_review"));
});

test("renderable alias resolution remains strict", () => {
  assert.equal(resolveNeighborhoodGeometry([validRecord], { cityCanonicalId: "casablanca", neighborhood: "Maarif" })?.neighborhoodCanonicalId, "maarif");
  assert.equal(resolveNeighborhoodGeometry([validRecord, { ...validRecord }], { cityCanonicalId: "casablanca", neighborhood: "Maarif" }), null);
});

test("geometry registry never changes Search ranking", () => {
  assert.equal(geometryRegistryChangesRanking(), false);
});
