import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import geometryAudit from "../../../data/geo/casablanca-arrondissements-osm.audit.json";
import geometryCollection from "../../../data/geo/casablanca-arrondissements-osm.json";
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
  casablancaShadowGeometryIsComplete,
  listCasablancaShadowGeometries,
  listCasablancaShadowGeometryCandidates,
} from "../../../lib/geo/casablanca-neighborhood-geometry-shadow";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

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

test("Casablanca Shadow contains 16 auditable candidates and 16 materialized geometries", () => {
  const candidates = listCasablancaShadowGeometryCandidates();
  const geometries = listCasablancaShadowGeometries();
  assert.equal(candidates.length, 16);
  assert.equal(geometries.length, 16);
  assert.equal(casablancaShadowGeometryIsComplete(), true);
  assert.equal(new Set(candidates.map((item) => item.sourceEntityId)).size, 16);
  assert.equal(new Set(geometries.map((item) => item.neighborhoodCanonicalId)).size, 16);
  assert.equal(new Set(geometries.map((item) => item.source.sourceUrl)).size, 16);
  assert.ok(candidates.every((item) => item.publicationStatus === "shadow"));
  assert.ok(geometries.every((item) => item.publicationStatus === "shadow" && item.reviewed === false));
  assert.equal(CASABLANCA_GEOMETRY_SOURCE_POLICY.usageMode, "shadow-only");
});

test("all materialized geometries pass registry validation and ODbL provenance", () => {
  for (const geometry of listCasablancaShadowGeometries()) {
    assert.deepEqual(validateNeighborhoodGeometryRecord(geometry), []);
    assert.equal(geometry.source.licenseId, "ODbL-1.0");
    assert.match(geometry.source.sourceUrl, /openstreetmap\.org\/relation\/\d+$/);
  }
});

test("generated topology audit and GeoJSON inventory are complete", () => {
  assert.equal(geometryAudit.status, "passed");
  assert.equal(geometryAudit.featureCount, 16);
  assert.equal(geometryAudit.uniqueRelationCount, 16);
  assert.equal(geometryAudit.uniqueCanonicalCount, 16);
  assert.equal(geometryAudit.allTopologiesValid, true);
  assert.equal(geometryAudit.publicationStatus, "shadow");
  assert.equal(geometryCollection.type, "FeatureCollection");
  assert.equal(geometryCollection.features.length, 16);
  assert.ok(geometryCollection.features.every((feature) => feature.properties.geometryStatus === "materialized"));
});

test("all Casablanca relation candidates have valid provenance and canonical identity", () => {
  for (const candidate of listCasablancaShadowGeometryCandidates()) {
    assert.deepEqual(validateNeighborhoodGeometryCandidateRecord(candidate), []);
    assert.match(candidate.source.sourceUrl, new RegExp(`/relation/${candidate.sourceEntityId}$`));
  }
});

test("candidate and geometry alias matching are accent tolerant and refuse ambiguity", () => {
  const candidates = listCasablancaShadowGeometryCandidates();
  const geometries = listCasablancaShadowGeometries();
  assert.equal(normalizeGeometryAlias("Maârif"), "maarif");
  assert.equal(resolveNeighborhoodGeometryCandidate(candidates, { cityCanonicalId: "casablanca", neighborhood: "Maarif" })?.sourceEntityId, 2801474);
  assert.equal(resolveNeighborhoodGeometry(geometries, { cityCanonicalId: "casablanca", neighborhood: "Maarif" })?.neighborhoodCanonicalId, "maarif");
  assert.equal(resolveNeighborhoodGeometryCandidate([...candidates, { ...candidates[0] }], { cityCanonicalId: "casablanca", neighborhood: "Anfa" }), null);
});

test("preview choropleth is server-gated and synchronizes district without production exposure", () => {
  const controller = source("lib/geo/casablanca-geometry-canary.ts");
  const route = source("app/api/geo/casablanca-arrondissements/route.ts");
  const choropleth = source("components/search/CasablancaNeighborhoodChoropleth.tsx");
  const dock = source("components/search/SearchMapNeighborhoodDock.tsx");

  assert.ok(controller.includes("NEIGHBORHOOD_GEOMETRY_CANARY_ENABLED"));
  assert.ok(controller.includes("NEIGHBORHOOD_GEOMETRY_CANARY_APPROVED"));
  assert.ok(controller.includes("NEIGHBORHOOD_GEOMETRY_CANARY_STOP"));
  assert.ok(controller.includes('deploymentEnvironment === "production"'));
  assert.ok(controller.includes("MAX_GEOMETRY_CANARY_PERCENT = 1"));
  assert.ok(route.includes("readCasablancaGeometryCanaryConfig"));
  assert.ok(route.includes("decideCasablancaGeometryCanary"));
  assert.ok(choropleth.includes("/api/geo/casablanca-arrondissements"));
  assert.ok(choropleth.includes('params.set("district", district)'));
  assert.ok(choropleth.includes("© OpenStreetMap contributors"));
  assert.ok(dock.includes('city.trim().toLowerCase() === "casablanca"'));
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

test("geometry registry never changes Search ranking", () => {
  assert.equal(geometryRegistryChangesRanking(), false);
});
