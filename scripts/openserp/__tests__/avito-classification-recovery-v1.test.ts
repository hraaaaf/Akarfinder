import assert from "node:assert/strict";
import { classifyOpenSerpResult } from "../../../lib/openserp-ingestion/classify";
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

console.log("avito classification recovery v1: PASS");
