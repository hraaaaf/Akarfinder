import assert from "node:assert/strict";
import { test } from "node:test";
import { findDistrict } from "../../lib/geo/district-matcher";
import { getAnnL5CertifiedSeedPois } from "../../lib/neighborhood-context/certified-seed";

test("explicit source URL district wins over ambiguous descriptive text when title is silent", () => {
  const result = findDistrict(
    "Rabat",
    "Appartement à vendre 1 060 000 dh 96 m² 2 chambres Les...",
    "Rabat Agdal Riyad Les Orangers. Un magnifique appartement est proposé à la vente.",
    "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/les-orangers/346540",
  );

  assert.equal(result.district, "Les Orangers");
  assert.equal(result.source, "source_url");
  assert.equal(result.confidence, "high");
  assert.equal(result.applyEligible, true);
});

test("conflicting explicit title and URL districts fail closed", () => {
  const result = findDistrict(
    "Rabat",
    "BEAU DUPLEX 3Ch en location à SOUISSI Appartements à Rabat",
    null,
    "https://avito.ma/fr/hassan/appartements/BEAU_DUPLEX_3Ch_en_location_%C3%A0_SOUISSI_57446333.htm",
  );

  assert.equal(result.district, null);
  assert.equal(result.source, "none");
  assert.equal(result.applyEligible, false);
  assert.match(result.reason, /Conflicting explicit districts/);
});

test("title matching remains available when source URL has no explicit district", () => {
  const result = findDistrict("Rabat", "Appartement Agdal Rabat 2 chambres", null, null);
  assert.equal(result.district, "Agdal");
  assert.equal(result.source, "title");
});

test("certified Agdal continuity seed excludes the low-quality crastelf label", () => {
  const pois = getAnnL5CertifiedSeedPois("district_rabat_agdal", new Date("2026-08-20T00:00:00Z"));
  assert.equal(pois.some((poi) => poi.name.toLowerCase() === "crastelf 2"), false);
  assert.equal(pois.some((poi) => poi.source_entity_id === "node/10308418440"), false);
});
