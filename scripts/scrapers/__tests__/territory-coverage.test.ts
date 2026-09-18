import assert from "node:assert/strict";
import test from "node:test";

import {
  getCitiesNeedingLandmarkEnrichment,
  getTerritoryCityCoverage,
  getTerritoryCoverageReport,
} from "../../../lib/geo/territory-coverage";

test("coverage report exposes every canonical city without pretending completion", () => {
  const report = getTerritoryCoverageReport();
  assert.equal(report.length, 19);
  assert.ok(report.every((entry) => entry.landmarkCoverageRatio >= 0 && entry.landmarkCoverageRatio <= 1));
});

test("six cities currently have at least one verified landmark", () => {
  const covered = getTerritoryCoverageReport()
    .filter((entry) => entry.verifiedLandmarkCount > 0)
    .map((entry) => entry.citySlug)
    .sort();

  assert.deepEqual(covered, ["agadir", "casablanca", "fes", "marrakech", "rabat", "tanger"].sort());
});

test("Casablanca coverage remains explicitly partial", () => {
  const casa = getTerritoryCityCoverage("casablanca");
  assert.equal(casa.canonicalDistrictCount, 6);
  assert.equal(casa.districtsWithVerifiedLandmark, 3);
  assert.equal(casa.verifiedLandmarkCount, 3);
  assert.ok(!casa.missingLandmarkDistrictIds.includes("district_casablanca_maarif"));
  assert.ok(!casa.missingLandmarkDistrictIds.includes("district_casablanca_ain_diab"));
  assert.ok(casa.missingLandmarkDistrictIds.includes("district_casablanca_racine"));
});

test("enrichment queue includes only canonical cities with uncovered districts", () => {
  const queue = getCitiesNeedingLandmarkEnrichment().map((entry) => entry.citySlug);
  assert.ok(queue.includes("casablanca"));
  assert.ok(!queue.includes("tanger"));
  assert.ok(!queue.includes("rabat"));
  assert.ok(!queue.includes("fes"));
  assert.ok(!queue.includes("agadir"));
});

test("Rabat, Tanger and Fes are fully covered after certified batch three", () => {
  const rabat = getTerritoryCityCoverage("rabat");
  assert.equal(rabat.canonicalDistrictCount, 5);
  assert.equal(rabat.districtsWithVerifiedLandmark, 5);
  assert.deepEqual(rabat.missingLandmarkDistrictIds, []);

  const tanger = getTerritoryCityCoverage("tanger");
  assert.equal(tanger.canonicalDistrictCount, 3);
  assert.equal(tanger.districtsWithVerifiedLandmark, 3);
  assert.deepEqual(tanger.missingLandmarkDistrictIds, []);

  const fes = getTerritoryCityCoverage("fes");
  assert.equal(fes.canonicalDistrictCount, 2);
  assert.equal(fes.districtsWithVerifiedLandmark, 2);
  assert.deepEqual(fes.missingLandmarkDistrictIds, []);
});
