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

test("Casablanca coverage reports the three newly canonical districts still awaiting landmark evidence", () => {
  const casa = getTerritoryCityCoverage("casablanca");
  assert.equal(casa.canonicalDistrictCount, 9);
  assert.equal(casa.districtsWithVerifiedLandmark, 6);
  assert.equal(casa.verifiedLandmarkCount, 7);
  assert.deepEqual(
    casa.missingLandmarkDistrictIds.sort(),
    [
      "district_casablanca_californie",
      "district_casablanca_hay_hassani",
      "district_casablanca_sidi_maarouf",
    ].sort(),
  );
});

test("enrichment queue keeps Casablanca and Sale open while canonical districts lack landmark evidence", () => {
  const queue = getCitiesNeedingLandmarkEnrichment();
  assert.deepEqual(queue.map((entry) => entry.citySlug).sort(), ["casablanca", "sale", "temara"]);
  const casa = queue.find((entry) => entry.citySlug === "casablanca");
  const sale = queue.find((entry) => entry.citySlug === "sale");
  const temara = queue.find((entry) => entry.citySlug === "temara");
  assert.equal(casa?.canonicalDistrictCount, 9);
  assert.equal(casa?.districtsWithVerifiedLandmark, 6);
  assert.equal(sale?.canonicalDistrictCount, 5);
  assert.equal(sale?.districtsWithVerifiedLandmark, 0);
  assert.equal(temara?.canonicalDistrictCount, 5);
  assert.equal(temara?.districtsWithVerifiedLandmark, 0);
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

test("Sale canonical identities are fail-closed until landmark evidence is added", () => {
  const sale = getTerritoryCityCoverage("sale");
  assert.equal(sale.canonicalDistrictCount, 5);
  assert.equal(sale.districtsWithVerifiedLandmark, 0);
  assert.equal(sale.verifiedLandmarkCount, 0);
  assert.deepEqual(
    sale.missingLandmarkDistrictIds.sort(),
    [
      "district_sale_bab_lamrissa",
      "district_sale_bettana",
      "district_sale_hssaine",
      "district_sale_laayayda",
      "district_sale_tabriquet",
      "district_temara_hay_al_maghreb_al_arabi",
      "district_temara_hay_al_wifaq",
      "district_temara_ibnou_rochd",
      "district_temara_massira_1",
      "district_temara_oulad_mtaa",
    ].sort(),
  );
});

test("Temara canonical identities are fail-closed until landmark evidence is added", () => {
  const temara = getTerritoryCityCoverage("temara");
  assert.equal(temara.canonicalDistrictCount, 5);
  assert.equal(temara.districtsWithVerifiedLandmark, 0);
  assert.equal(temara.verifiedLandmarkCount, 0);
  assert.deepEqual(
    temara.missingLandmarkDistrictIds.sort(),
    [
      "district_temara_hay_al_maghreb_al_arabi",
      "district_temara_hay_al_wifaq",
      "district_temara_ibnou_rochd",
      "district_temara_massira_1",
      "district_temara_oulad_mtaa",
    ].sort(),
  );
});

test("coverage remains fail-closed for canonical districts without verified landmark evidence", () => {
  const missing = getTerritoryCoverageReport()
    .flatMap((entry) => entry.missingLandmarkDistrictIds)
    .sort();

  assert.deepEqual(
    missing,
    [
      "district_casablanca_californie",
      "district_casablanca_hay_hassani",
      "district_casablanca_sidi_maarouf",
      "district_sale_bab_lamrissa",
      "district_sale_bettana",
      "district_sale_hssaine",
      "district_sale_laayayda",
      "district_sale_tabriquet",
    ].sort(),
  );
  assert.equal(
    getTerritoryCoverageReport().reduce((total, entry) => total + entry.districtsWithVerifiedLandmark, 0),
    23,
  );
});
