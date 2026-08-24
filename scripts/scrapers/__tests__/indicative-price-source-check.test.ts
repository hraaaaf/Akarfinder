import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deriveIndicativePriceMad } from "../../../lib/search-gateway/indicative-price";

test("Agenz exposes one plausible amount as indicative", () => {
  assert.equal(deriveIndicativePriceMad({
    domain: "agenz.ma",
    intent: "rent",
    title: "Appartement à louer",
    snippet: "Appartement disponible à 8 500 DH par mois",
  }), 8500);
});

test("explicit sale title overrides a wrong normalized rent intent", () => {
  assert.equal(deriveIndicativePriceMad({
    domain: "agenz.ma",
    intent: "rent",
    title: "Terrain à vendre à Quartier Des Ambassades",
    snippet: "Terrain à vendre 9 000 000 DH 1 500 m²",
  }), 9_000_000);
});

test("Agenz rejects multiple amounts instead of guessing", () => {
  assert.equal(deriveIndicativePriceMad({
    domain: "agenz.ma",
    intent: "sale",
    title: "Projet résidentiel",
    snippet: "Prix à partir de 900 000 DH. Autre lot 1 200 000 DH.",
  }), null);
});

test("Agenz rejects per-m2 and short-stay contexts", () => {
  assert.equal(deriveIndicativePriceMad({
    domain: "agenz.ma",
    intent: "sale",
    snippet: "Terrain 5 700 DH / m²",
  }), null);
  assert.equal(deriveIndicativePriceMad({
    domain: "agenz.ma",
    intent: "rent",
    snippet: "Studio 1 200 DH par nuit",
  }), null);
});

test("non-Agenz sources stay fail-closed", () => {
  assert.equal(deriveIndicativePriceMad({
    domain: "mubawab.ma",
    intent: "rent",
    snippet: "Appartement 6 000 DH",
  }), null);
});

test("intent floors reject implausible totals", () => {
  assert.equal(deriveIndicativePriceMad({
    domain: "agenz.ma",
    intent: "sale",
    snippet: "Terrain 5 000 DH",
  }), null);
  assert.equal(deriveIndicativePriceMad({
    domain: "agenz.ma",
    intent: "rent",
    snippet: "Appartement 500 DH",
  }), null);
});

test("external minimal SERP keeps inferred prices hidden and only links to original sources", () => {
  const card = readFileSync("components/search/ExternalIndexedResultCard.tsx", "utf8");
  assert.match(card, /result\.original_url/);
  assert.match(card, /sourcePages\[0\]\.url/);
  assert.match(card, /Ouvrir la source/);
  assert.match(card, /Voir les \{sourcePages\.length\} pages/);
  assert.doesNotMatch(card, /deriveIndicativePriceMad|Prix indicatif|data-price-confidence/);
  assert.doesNotMatch(card, /normalized_price_mad|presentation\.priceMad|formatPrice/);
  assert.doesNotMatch(card, /result\.title|result\.snippet/);
});
