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

test("eight cities currently have at least one verified landmark", () => {
  const covered = getTerritoryCoverageReport()
    .filter((entry) => entry.verifiedLandmarkCount > 0)
    .map((entry) => entry.citySlug)
    .sort();

  assert.deepEqual(covered, ["agadir", "casablanca", "fes", "kenitra", "marrakech", "mohammedia", "rabat", "tanger"].sort());
});

test("Casablanca coverage remains explicitly partial", () => {
  const casa = getTerritoryCityCoverage("casablanca");
  assert.equal(casa.canonicalDistrictCount, 6);
  assert.equal(casa.districtsWithVerifiedLandmark, 5);
  assert.equal(casa.verifiedLandmarkCount, 5);
  assert.deepEqual(casa.missingLandmarkDistrictIds, ["district_casablanca_racine"]);
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

test("batch four leaves only Racine and Route de l'Ourika uncovered", () => {
  const missing = getTerritoryCoverageReport()
    .flatMap((entry) => entry.missingLandmarkDistrictIds)
    .sort();

  assert.deepEqual(missing, [
    "district_casablanca_racine",
    "district_marrakech_ourika",
  ]);
  assert.deepEqual(getTerritoryCityCoverage("kenitra").missingLandmarkDistrictIds, []);
  assert.deepEqual(getTerritoryCityCoverage("mohammedia").missingLandmarkDistrictIds, []);
});
