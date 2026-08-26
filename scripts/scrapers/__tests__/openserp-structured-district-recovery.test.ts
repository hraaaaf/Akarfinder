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

test("recovers DarAgadir district phrases from individual detail slugs", () => {
  assert.deepEqual(
    extractDistrictNational("https://daragadir.com/annonces/annonces-immobilieres/location/appartements-a-louer-a-agadir/appartements-a-louer-a-agadir-el-houda-2-pieces-60-m%C2%B2-pour-2-500-dh.html"),
    { city: "Agadir", district: "El Houda" },
  );
  assert.deepEqual(
    extractDistrictNational("https://daragadir.com/annonces/annonces-immobilieres/location/magasins-et-commerces-a-louer-a-agadir/grand-local-commercial-a-louer-de-92-m%C2%B2-a-agadir-hay-al-farah-15-000-dh.html"),
    { city: "Agadir", district: "Hay Al Farah" },
  );
  assert.deepEqual(
    extractDistrictNational("https://daragadir.com/annonces/annonces-immobilieres/location/bureaux-a-louer-a-agadir/bureaux-a-louer-a-agadir-centre-ville-85-m%C2%B2-pour-5-200-dh.html"),
    { city: "Agadir", district: "Centre-ville" },
  );
  assert.deepEqual(
    extractDistrictNational("https://daragadir.com/annonces/annonces-immobilieres/vente/appartements-a-vendre-a-agadir/appartement-a-vendre-a-agadir-hay-najah-2-chambres-850-000-dh.html"),
    { city: "Agadir", district: "Hay Najah" },
  );
});

test("rejects DarAgadir detail slugs with multiple explicit district matches", () => {
  assert.equal(
    extractDistrictNational("https://daragadir.com/annonces/annonces-immobilieres/location/magasins-et-commerces-a-louer-a-agadir/local-commercial-a-louer-a-agadir-amsernate-580-m%C2%B2-en-plein-centre-ville-pour-25-000-dh.html"),
    null,
  );
  assert.equal(
    extractDistrictNational("https://daragadir.com/annonces/annonces-immobilieres/vente/appartements-a-vendre-a-agadir/appartements-a-vendre-a-agadir-el-houda-superficie-de-82-a-92-m%C2%B2-a-tassila-3-chambres-prix-en-hausse-a-935-000-dh.html"),
    null,
  );
});

test("DarAgadir standalone aliases stay scoped to individual detail URLs", () => {
  assert.equal(
    extractDistrictNational("https://daragadir.com/annonces/annonces-immobilieres/location/appartements-a-louer-a-agadir/"),
    null,
  );
  assert.equal(
    extractDistrictNational("https://example.com/listing/hay-al-farah-agadir"),
    null,
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
