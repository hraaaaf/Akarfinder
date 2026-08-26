import test from "node:test";
import assert from "node:assert/strict";
import { extractDistrictNational } from "../../../lib/openserp-ingestion/national-utils";

test("Agenz takes city from the city URL segment, not the district name", () => {
  assert.deepEqual(
    extractDistrictNational("https://agenz.ma/fr/annonces/immo-marrakech/location-villas/route-de-fes/486968"),
    { city: "Marrakech", district: "Route De Fes" },
  );
  assert.deepEqual(
    extractDistrictNational("https://agenz.ma/fr/annonces/immo-casablanca/location-appartements/finance-city/885407"),
    { city: "Casablanca", district: "Finance City" },
  );
});

test("Mouldar takes city from the dedicated city URL segment", () => {
  assert.deepEqual(
    extractDistrictNational("https://mouldar.com/fr/achat/appartement/marrakech/route-de-casablanca/07f83efa"),
    { city: "Marrakech", district: "Route De Casablanca" },
  );
  assert.equal(
    extractDistrictNational("https://mouldar.com/fr/location/appartement/casablanca/toute-la-ville/d2e13e24"),
    null,
  );
});
