import test from "node:test";
import assert from "node:assert/strict";
import { extractDistrictNational } from "../../../lib/openserp-ingestion/national-utils";

test("recovers Agenz district slug as explicit geography", () => {
  assert.deepEqual(
    extractDistrictNational("https://agenz.ma/fr/annonces/immo-agadir/vente-appartements/riad-salam/795607"),
    { city: "Agadir", district: "Riad Salam" },
  );
  assert.deepEqual(
    extractDistrictNational("https://agenz.ma/fr/annonces/immo-agadir/vente-villas/cite-suisse/756217"),
    { city: "Agadir", district: "Cite Suisse" },
  );
});

test("recovers Mouldar district slug as explicit geography", () => {
  assert.deepEqual(
    extractDistrictNational("https://mouldar.com/fr/achat/appartement/agadir/hay-mohammadi/18cdc3ac"),
    { city: "Agadir", district: "Hay Mohammadi" },
  );
});

test("does not manufacture a district from category-only URLs", () => {
  assert.equal(extractDistrictNational("https://mouldar.com/fr/location/villa/agadir"), null);
  assert.equal(extractDistrictNational("https://agenz.ma/fr/annonces/immo-agadir/vente-appartements"), null);
});
