import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deriveIndicativePriceMad } from "../../../lib/search-gateway/indicative-price";

test("Agenz price parser remains fail-closed at the utility boundary", () => {
  assert.equal(deriveIndicativePriceMad({ domain: "agenz.ma", intent: "rent", title: "Appartement à louer", snippet: "Appartement disponible à 8 500 DH par mois" }), 8500);
  assert.equal(deriveIndicativePriceMad({ domain: "agenz.ma", intent: "sale", title: "Projet résidentiel", snippet: "Prix à partir de 900 000 DH. Autre lot 1 200 000 DH." }), null);
  assert.equal(deriveIndicativePriceMad({ domain: "mubawab.ma", intent: "rent", snippet: "Appartement 6 000 DH" }), null);
});

test("external SERP never uses derived indicative price as display content", () => {
  const card = readFileSync("components/search/ExternalIndexedResultCard.tsx", "utf8");
  assert.doesNotMatch(card, /deriveIndicativePriceMad|indicativePrice|Prix indicatif|data-price-confidence/);
  assert.match(card, /formatTrustedPrice\(result\.normalized_price_mad\)/);
});
