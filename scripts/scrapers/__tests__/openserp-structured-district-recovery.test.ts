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

test("recovers evidence-backed Agadir districts only when city context is present", () => {
  assert.deepEqual(
    extractDistrictNational("Magasin à louer à Agadir Marina 35 000 DH"),
    { city: "Agadir", district: "Marina" },
  );
  assert.deepEqual(
    extractDistrictNational("Terrain résidentiel à Aghroud Ben Serguaou Agadir 4 020 000 DH"),
    { city: "Agadir", district: "Aghroud" },
  );
  assert.deepEqual(
    extractDistrictNational("Terrain à vendre à Cité Adrar Agadir 750 000 DH"),
    { city: "Agadir", district: "Cité Adrar" },
  );
  assert.equal(extractDistrictNational("Appartement Marina 950 000 DH"), null);
});

test("does not manufacture a district from category-only URLs", () => {
  assert.equal(extractDistrictNational("https://mouldar.com/fr/location/villa/agadir"), null);
  assert.equal(extractDistrictNational("https://agenz.ma/fr/annonces/immo-agadir/vente-appartements"), null);
});
