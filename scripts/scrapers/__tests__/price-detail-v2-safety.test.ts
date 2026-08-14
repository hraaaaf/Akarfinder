import assert from "node:assert/strict";
import test from "node:test";
import {
  extractStrictDetailPrice,
  isRecognizedDetailUrl,
} from "../price-detail-enrichment-v2";

test("recognized detail URLs exclude category/search pages", () => {
  assert.equal(isRecognizedDetailUrl("avito.ma", "https://avito.ma/fr/agdal/appartements/Bien_58006831.htm"), true);
  assert.equal(isRecognizedDetailUrl("promoimmomarrakech.com", "https://promoimmomarrakech.com/produit/bv-10/vente-bureau-marrakech-gueliz.html"), true);
  assert.equal(isRecognizedDetailUrl("daragadir.com", "https://daragadir.com/annonces/x/y/fiche.html"), true);
  assert.equal(isRecognizedDetailUrl("mubawab.ma", "https://mubawab.ma/fr/a/8353597/appartement-x"), true);
  assert.equal(isRecognizedDetailUrl("mubawab.ma", "https://mubawab.ma/fr/is/appartement-location-rabat"), false);
  assert.equal(isRecognizedDetailUrl("mouldar.com", "https://mouldar.com/en/rent/studio/marrakech"), false);
});

test("strict detail price accepts explicit total price", () => {
  const html = `<!doctype html><html><head><title>Appartement à vendre – 1 250 000 DH</title></head><body><h1>Appartement à vendre – 1 250 000 DH</h1></body></html>`;
  assert.equal(extractStrictDetailPrice(html, "sale"), 1_250_000);
});

test("strict detail price rejects per-m2 price and price on request", () => {
  const perM2 = `<!doctype html><html><body><h1>Terrain à vendre – 5 700 DH / m²</h1></body></html>`;
  const onRequest = `<!doctype html><html><body><h1>Villa à vendre – Prix sur demande</h1></body></html>`;
  assert.equal(extractStrictDetailPrice(perM2, "sale"), null);
  assert.equal(extractStrictDetailPrice(onRequest, "sale"), null);
});

test("strict detail price applies sale/rent plausibility floors", () => {
  const lowSale = `<!doctype html><html><body><h1>Bureau à vendre – 9 500 DH</h1></body></html>`;
  const rent = `<!doctype html><html><body><h1>Appartement à louer – 4 500 DH</h1></body></html>`;
  assert.equal(extractStrictDetailPrice(lowSale, "sale"), null);
  assert.equal(extractStrictDetailPrice(rent, "rent"), 4_500);
});
