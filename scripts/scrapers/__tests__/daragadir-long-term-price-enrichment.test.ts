import assert from "node:assert/strict";
import test from "node:test";
import { isDarAgadirShortStay } from "../daragadir-long-term-price-enrichment";

test("DarAgadir long-term lane excludes vacation and cadence URLs", () => {
  assert.equal(isDarAgadirShortStay("https://daragadir.com/annonces/location-de-vacances/x.html"), true);
  assert.equal(isDarAgadirShortStay("https://daragadir.com/annonces/appartement-4300-dh-par-jour.html"), true);
  assert.equal(isDarAgadirShortStay("https://daragadir.com/annonces/location-journaliere-x.html"), true);
  assert.equal(isDarAgadirShortStay("https://daragadir.com/annonces/location-quotidienne-x.html"), true);
  assert.equal(isDarAgadirShortStay("https://daragadir.com/annonces/location/appartement-a-louer-5500-dh.html"), false);
  assert.equal(isDarAgadirShortStay("https://daragadir.com/annonces/vente/appartement-960000-dh.html"), false);
});
