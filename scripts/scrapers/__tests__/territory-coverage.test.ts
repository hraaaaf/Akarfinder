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

test("sixteen cities currently have at least one verified landmark", () => {
  const covered = getTerritoryCoverageReport()
    .filter((entry) => entry.verifiedLandmarkCount > 0)
    .map((entry) => entry.citySlug)
    .sort();

  assert.deepEqual(covered, ["agadir", "bouznika", "casablanca", "el-jadida", "essaouira", "fes", "kenitra", "marrakech", "meknes", "mohammedia", "nador", "rabat", "sale", "tanger", "temara", "tetouan"].sort());
});

test("Casablanca coverage reports the three newly canonical districts still awaiting landmark evidence", () => {
  const casa = getTerritoryCityCoverage("casablanca");
  assert.equal(casa.canonicalDistrictCount, 9);
  assert.equal(casa.districtsWithVerifiedLandmark, 6);
  assert.equal(casa.verifiedLandmarkCount, 7);
  assert.deepEqual(
    casa.missingLandmarkDistrictIds.sort(),
    [
          ].sort(),
  );
});

const OPEN_LANDMARK_GAPS = {
  casablanca: [
    "district_casablanca_californie",
    "district_casablanca_hay_hassani",
    "district_casablanca_sidi_maarouf",
  ],
  sale: [
    "district_sale_hssaine",
    "district_sale_laayayda",
  ],
  temara: [
    "district_temara_oulad_mtaa",
  ],
  meknes: [
    "district_meknes_hamria",
  ],
  tetouan: [
  ],
  oujda: [
    "district_oujda_centre_ville",
    "district_oujda_hay_boudir",
  ],
  "el-jadida": [
    "district_el_jadida_plateau",
  ],
  nador: [
    "district_nador_hay_aarid",
  ],
  essaouira: [
    "district_essaouira_kasbah",
  ],
  bouznika: [
    "district_bouznika_al_wouroud",
    "district_bouznika_hay_amal",
    "district_bouznika_hay_ghita",
    "district_bouznika_hay_salim",
  ],
} as const;

test("enrichment queue exposes every currently open canonical city", () => {
  const queue = getCitiesNeedingLandmarkEnrichment();
  assert.deepEqual(
    queue.map((entry) => entry.citySlug).sort(),
    Object.keys(OPEN_LANDMARK_GAPS).sort(),
  );
});

test("Rabat, Tanger and Fes are fully covered after certified batch three", () => {
  for (const city of ["rabat", "tanger", "fes"] as const) {
    const coverage = getTerritoryCityCoverage(city);
    assert.deepEqual(coverage.missingLandmarkDistrictIds, []);
  }
});

test("new national identity batches remain fail-closed until landmark evidence is added", () => {
  for (const [city, expectedMissing] of Object.entries(OPEN_LANDMARK_GAPS)) {
    const coverage = getTerritoryCityCoverage(city as Parameters<typeof getTerritoryCityCoverage>[0]);
    assert.deepEqual(coverage.missingLandmarkDistrictIds.sort(), [...expectedMissing].sort());
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
    50,
  );
});
