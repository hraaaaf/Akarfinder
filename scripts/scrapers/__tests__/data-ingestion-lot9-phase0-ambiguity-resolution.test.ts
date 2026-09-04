import test from "node:test";
import assert from "node:assert/strict";

import {
  nextAmbiguityResolutionStep,
  resolveDetailSemanticEvidence,
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
    title: "Chambre meublée pour fille",
    description: "Chambre en colocation dans un appartement de 98 m².",
  });
  assert.equal(result.clear, true);
  assert.equal(result.property_type, "apartment");
  assert.equal(result.transaction_type, "rent");
  assert.equal(result.offer_scope, "room");
  assert(result.evidence.includes("human_precedent_1_room_in_apartment"));
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
