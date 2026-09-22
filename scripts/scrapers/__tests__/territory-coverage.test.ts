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

test("seventeen cities currently have at least one verified landmark", () => {
  const covered = getTerritoryCoverageReport()
    .filter((entry) => entry.verifiedLandmarkCount > 0)
    .map((entry) => entry.citySlug)
    .sort();

  assert.deepEqual(covered, ["agadir", "bouznika", "casablanca", "el-jadida", "essaouira", "fes", "kenitra", "marrakech", "meknes", "mohammedia", "nador", "oujda", "rabat", "sale", "tanger", "temara", "tetouan"].sort());
});

test("Casablanca is fully landmark-covered across its nine canonical districts", () => {
  const casa = getTerritoryCityCoverage("casablanca");
  assert.equal(casa.canonicalDistrictCount, 9);
  assert.equal(casa.districtsWithVerifiedLandmark, 9);
  assert.ok(casa.verifiedLandmarkCount >= 10);
  assert.deepEqual(casa.missingLandmarkDistrictIds, []);
});

const OPEN_LANDMARK_GAPS = {} as const;

test("enrichment queue is empty at full canonical-district landmark coverage", () => {
  assert.deepEqual(getCitiesNeedingLandmarkEnrichment(), []);
});

test("Rabat, Tanger and Fes are fully covered after certified batch three", () => {
  for (const city of ["rabat", "tanger", "fes"] as const) {
    const coverage = getTerritoryCityCoverage(city);
    assert.deepEqual(coverage.missingLandmarkDistrictIds, []);
  }
});

test("every canonical district with product depth now has landmark evidence", () => {
  for (const coverage of getTerritoryCoverageReport()) {
    if (coverage.canonicalDistrictCount === 0) continue;
    assert.equal(coverage.landmarkCoverageRatio, 1, coverage.citySlug);
    assert.deepEqual(coverage.missingLandmarkDistrictIds, [], coverage.citySlug);
  }
});

test("coverage remains fail-closed for every canonical district without verified landmark evidence", () => {
  const missing = getTerritoryCoverageReport()
    .flatMap((entry) => entry.missingLandmarkDistrictIds)
    .sort();
  const expected = Object.values(OPEN_LANDMARK_GAPS).flatMap((ids) => [...ids]).sort();

  assert.deepEqual(missing, expected);
  assert.equal(
    getTerritoryCoverageReport().reduce((total, entry) => total + entry.districtsWithVerifiedLandmark, 0),
    63,
  );
});
