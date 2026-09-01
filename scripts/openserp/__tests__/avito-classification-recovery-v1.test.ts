import assert from "node:assert/strict";
import { classifyOpenSerpResult } from "../../../lib/openserp-ingestion/classify";
import { extractCityNational, extractDistrictNational } from "../../../lib/openserp-ingestion/national-utils";
import type { OpenSerpIngestionQuery } from "../../../lib/openserp-ingestion/types";

const query: OpenSerpIngestionQuery = {
  query_id: "avito-recovery-test",
  city: "Rabat",
  district: "Agdal",
  transaction_type: "rent",
  property_type: "bureau",
  query_text: "bureau a louer rabat",
  priority: "high",
  target_domain: "avito.ma",
};

function classify(url: string, title: string, city: string) {
  return classifyOpenSerpResult({
    result: { url, title, snippet: "" },
    query,
    engine: "bing",
    discovered_at: "2026-08-31T20:00:00.000Z",
    fallbackRank: 1,
    extractCityFn: () => city,
    extractDistrictFn: () => null,
  });
}

function classifyNational(input: {
  url: string;
  title: string;
  snippet?: string;
  city: string;
  transaction: "sale" | "rent";
  propertyType: string;
}) {
  const nationalQuery: OpenSerpIngestionQuery = {
    query_id: "avito-national-regression",
    city: input.city,
    district: "",
    transaction_type: input.transaction,
    property_type: input.propertyType,
    query_text: `${input.propertyType} ${input.transaction} ${input.city}`,
    priority: "medium",
  };
  return classifyOpenSerpResult({
    result: { url: input.url, title: input.title, snippet: input.snippet ?? "" },
    query: nationalQuery,
    engine: "searxng_yandex",
    discovered_at: "2026-08-31T20:00:00.000Z",
    fallbackRank: 1,
    extractCityFn: extractCityNational,
    extractDistrictFn: extractDistrictNational,
  });
}

const crossCityExact = classify(
  "https://avito.ma/fr/centre_ville/bureaux/BUREAU_A_LOUER_AGADIR_INEZGANE_58462439.htm",
  "BUREAU A LOUER AGADIR INEZGANE",
  "Agadir",
);
assert.ok(crossCityExact, "exact Avito result should classify");
assert.equal(crossCityExact.classification_lane, "individual_listing", "exact Avito real-estate detail path must not be quarantined only because the discovery query targeted another city");
assert.ok(crossCityExact.classification_reasons.includes("strong_individual_path"));
assert.ok(crossCityExact.classification_reasons.includes("avito_exact_re_path_location_authoritative"));

for (const [url, title, city] of [
  ["https://avito.ma/fr/sidi_kacem/vetements/Chemise_a_vendre_49680197.htm", "Chemise a vendre Sidi Kacem", "Sidi Kacem"],
  ["https://avito.ma/fr/taourirt/meubles/Canape_a_vendre_55598586.htm", "Canape a vendre Taourirt", "Taourirt"],
  ["https://avito.ma/fr/el_kelaa_des_sraghna/arts_et_collections/Tableau_a_vendre_56317420.htm", "Tableau a vendre El Kelaa des Sraghna", "El Kelaa des Sraghna"],
] as const) {
  const result = classify(url, title, city);
  assert.ok(result);
  assert.notEqual(result.classification_lane, "individual_listing", `non-real-estate Avito path must remain excluded: ${url}`);
  assert.ok(!result.classification_reasons.includes("strong_individual_path"), `non-real-estate Avito path must not receive strong_individual_path: ${url}`);
}

const missingTransaction = classify(
  "https://avito.ma/fr/centre_ville/bureaux/Bureau_centre_ville_58462440.htm",
  "Bureau centre ville Agadir",
  "Agadir",
);
assert.ok(missingTransaction);
assert.notEqual(missingTransaction.classification_lane, "individual_listing", "exact path must not bypass transaction evidence");

const discoveryPage = classify(
  "https://avito.ma/sp/immobilier/appartements-a-louer",
  "Appartements a louer au Maroc",
  "Rabat",
);
assert.ok(discoveryPage);
assert.notEqual(discoveryPage.classification_lane, "individual_listing", "Avito discovery/category pages must remain excluded");

const arabicSale = classifyNational({
  url: "https://avito.ma/fr/autre_secteur/terrains_et_fermes/%D8%A3%D8%B1%D8%B6_%D9%85%D8%AD%D9%81%D8%B8%D8%A9_%D9%84%D9%84%D8%A8%D9%8A%D8%B9__54219049.htm",
  title: "أرض محفظة للبيع Terrains et fermes à Tétouan Avito.ma",
  snippet: "أرض محفظة للبيع. Autre secteur Tétouan.",
  city: "Inezgane",
  transaction: "rent",
  propertyType: "terrain",
});
assert.ok(arabicSale);
assert.equal(arabicSale.extracted.city, "Tétouan", "Avito localized result title must outrank unrelated query city");
assert.equal(arabicSale.extracted.transaction_type, "sale", "explicit Arabic sale intent must outrank query fallback");
assert.equal(arabicSale.extracted.property_type, "land");

const saleRiad = classifyNational({
  url: "https://avito.ma/fr/medina/villas_et_riads/%D8%B1%D9%8A%D8%A7%D8%B6_%D9%85%D8%BA%D8%B1%D8%A8%D9%8A_%D8%AA%D9%82%D9%84%D9%8A%D8%AF%D9%8A_%D8%B9%D8%AA%D9%8A%D9%82__55128330.htm",
  title: "رياض مغربي تقليدي عتيق Villas et Riads à Salé Avito.ma",
  snippet: "بيع رياض مغربي عتيق بثمن مناسب",
  city: "Inezgane",
  transaction: "sale",
  propertyType: "riad",
});
assert.ok(saleRiad);
assert.equal(saleRiad.extracted.city, "Salé", "localized Avito title city must outrank ambiguous Medina district tokens");
assert.equal(saleRiad.extracted.district, null, "district from another city must not contaminate the listing");
assert.equal(saleRiad.extracted.transaction_type, "sale");
assert.equal(saleRiad.extracted.property_type, null, "explicit riad must not be rewritten as villa from Avito category boilerplate");

const arabicDuplexRent = classifyNational({
  url: "https://avito.ma/fr/m'hamid/appartements/lmhamid_abwab_Atlas__56231634.htm",
  title: "lmhamid abwab Atlas Appartements à Marrakech Avito.ma",
  snippet: "دوبلكس للايجار او الرهن announce Appartements au Maroc au meilleur prix sur Avito plateforme N°1 de vente et achat en ligne au Maroc.",
  city: "Marrakech",
  transaction: "sale",
  propertyType: "appartement",
});
assert.ok(arabicDuplexRent);
assert.equal(arabicDuplexRent.extracted.city, "Marrakech");
assert.equal(arabicDuplexRent.extracted.transaction_type, "rent", "explicit Arabic rent intent must outrank generic Avito vente boilerplate");
assert.equal(arabicDuplexRent.extracted.property_type, null, "explicit unsupported duplex must not inherit the Appartements category label");

const magasinRent = classifyNational({
  url: "https://avito.ma/fr/amsernate/local/magasin_a_louer_a_inezgane_56170584.htm",
  title: "magasin a louer a inezgane Local à Agadir Avito.ma",
  snippet: "magasin a louer a inezgane. Amsernate Agadir. magasin 50m plus 50m mezzanine a louer a inezgane.",
  city: "Inezgane",
  transaction: "rent",
  propertyType: "magasin",
});
assert.ok(magasinRent);
assert.equal(magasinRent.classification_lane, "individual_listing", "exact Avito magasin listing must classify as an individual listing");
assert.equal(magasinRent.extracted.city, "Agadir");
assert.equal(magasinRent.extracted.transaction_type, "rent");
assert.equal(magasinRent.extracted.property_type, "commercial");

const unsupportedBuilding = classifyNational({
  url: "https://avito.ma/fr/biar/autre_immobilier/Immeuble_%D8%B9%D9%85%D8%A7%D8%B1%D8%A9_170%D9%85%C2%B2_5_%D8%B4%D9%82%D9%82_58389694.htm",
  title: "Immeuble عمارة 170م² 5 شقق Autre Immobilier à Safi Avito.ma",
  snippet: "أعرض للبيع عمارة جديدة بمدينة آسفي",
  city: "Safi",
  transaction: "sale",
  propertyType: "terrain",
});
assert.ok(unsupportedBuilding);
assert.equal(unsupportedBuilding.extracted.city, "Safi");
assert.equal(unsupportedBuilding.extracted.transaction_type, "sale");
assert.equal(unsupportedBuilding.extracted.property_type, null, "explicit unsupported building type must remain null instead of inheriting unrelated query type");

console.log("avito classification recovery v1: PASS");
