import test from "node:test";
import assert from "node:assert/strict";

import {
  nextAmbiguityResolutionStep,
  resolveDetailSemanticEvidence,
  transactionFromExplicitRoute,
} from "../../../data-ingestion/sources/mubawab/ambiguity-resolution";

test("clear card evidence is classified without detail lookup", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: true, detailRobotsAllowed: true }), "classify_from_card");
});

test("ambiguous card must inspect a robots-allowed public detail before human escalation", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: true }), "inspect_allowed_detail");
});

test("clear detail evidence closes the ambiguity without human review", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: true, detailClear: true }), "classify_from_card");
});

test("human review happens only after allowed detail remains ambiguous or detail is unavailable", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: true, detailClear: false }), "human_review");
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: false }), "human_review");
});

test("Mubawab 8298787 style vague card resolves from explicit description", () => {
  const result = resolveDetailSemanticEvidence({
    extractedPropertyType: "unknown",
    extractedTransaction: null,
    routeUrl: "https://www.mubawab.ma/fr/is/logement-vente_casablanca_pas-cher",
    title: "La miséricorde est le bonheur 1 près du bus à Casablanca",
    description: "Découvrez cet appartement à vendre. 2 chambres, surface 54 m². Cet appartement est en vente à Sidi Othmane, Casablanca.",
  });
  assert.equal(result.clear, true);
  assert.equal(result.property_type, "apartment");
  assert.equal(result.transaction_type, "sale");
  assert.equal(result.offer_scope, "whole_property");
});

test("human precedent #1 resolves explicit room rental inside an apartment", () => {
  const result = resolveDetailSemanticEvidence({
    extractedPropertyType: "unknown",
    extractedTransaction: "rent",
    routeUrl: "https://www.mubawab.ma/fr/is/logement-location_casablanca_pas-cher",
    title: "Chambre meublée pour fille",
    description: "Chambre en colocation dans un appartement de 98 m².",
  });
  assert.equal(result.clear, true);
  assert.equal(result.property_type, "apartment");
  assert.equal(result.transaction_type, "rent");
  assert.equal(result.offer_scope, "room");
  assert(result.evidence.includes("human_precedent_1_room_in_apartment"));
});

test("ordinary one-bedroom apartment remains a whole-property offer", () => {
  const result = resolveDetailSemanticEvidence({
    extractedPropertyType: "apartment",
    extractedTransaction: "rent",
    title: "Appartement à louer à Casablanca",
    description: "Appartement de 60 m² avec 1 chambre, salon et cuisine.",
  });
  assert.equal(result.clear, true);
  assert.equal(result.property_type, "apartment");
  assert.equal(result.offer_scope, "whole_property");
  assert.equal(result.evidence.includes("human_precedent_1_room_in_apartment"), false);
});

test("explicit is route transaction resolves a detail that omits the sale/rent word", () => {
  assert.equal(transactionFromExplicitRoute("https://www.mubawab.ma/fr/is/logement-vente_casablanca_pas-cher"), "sale");
  assert.equal(transactionFromExplicitRoute("https://www.mubawab.ma/fr/is/logement-location_casablanca_pas-cher"), "rent");

  const result = resolveDetailSemanticEvidence({
    extractedPropertyType: "apartment",
    extractedTransaction: null,
    routeUrl: "https://www.mubawab.ma/fr/is/logement-location_casablanca_pas-cher",
    title: "Résidence Amlak Fin boulevard Chefchaouni",
    description: "Très beau appartement vide. Prix fixe 2200dh.",
  });
  assert.equal(result.clear, true);
  assert.equal(result.transaction_type, "rent");
  assert(result.evidence.includes("transaction_from_explicit_route"));
});

test("detail vs route transaction conflict stays behind human gate", () => {
  const result = resolveDetailSemanticEvidence({
    extractedPropertyType: "apartment",
    extractedTransaction: "sale",
    routeUrl: "https://www.mubawab.ma/fr/is/logement-location_casablanca_pas-cher",
    title: "Appartement",
    description: "Appartement disponible.",
  });
  assert.equal(result.clear, false);
  assert.equal(result.transaction_type, null);
  assert(result.evidence.includes("transaction_conflict_detail_vs_route"));
});

test("detail remains human-review material when no single property type can be proven", () => {
  const result = resolveDetailSemanticEvidence({
    extractedPropertyType: "unknown",
    extractedTransaction: "sale",
    title: "Très belle opportunité",
    description: "Bien à vendre à Casablanca, contactez-nous pour plus de détails.",
  });
  assert.equal(result.clear, false);
  assert.equal(result.property_type, null);
  assert.equal(result.transaction_type, "sale");
});
