import assert from "node:assert/strict";
import { test } from "node:test";

import { extractMubawabCollectionListing } from "../../../data-ingestion/sources/mubawab/extractor.js";

test("reads transaction evidence beyond 700 characters in the primary description", () => {
  const filler = "Appartement familial lumineux avec prestations soignées. ".repeat(20);
  const description = `${filler}Vente pour cause d'achat plus grand.`;
  assert.ok(description.indexOf("Vente") > 700);

  const html = `<!doctype html><html><head><meta property="og:title" content="Appartement 116 m² — Crêtes de Californie"></head><body><div>1 900 000 DH</div><div>116 m²</div><div>Casablanca</div><h1>Appartement 116 m² — Crêtes de Californie</h1><script type="application/ld+json">${JSON.stringify({
    "@type": "Apartment",
    name: "Appartement 116 m² — Crêtes de Californie",
    offers: { price: "1900000" },
    address: { addressLocality: "Casablanca" },
    floorSize: { value: 116 },
    description,
  })}</script></body></html>`;

  const listing = extractMubawabCollectionListing(
    "https://www.mubawab.ma/fr/a/8399780/appartement-116-m2-cretes-de-californie",
    html,
    "2026-09-03T18:45:00.000Z",
  );

  assert.equal(listing.transaction, "sale");
  assert.equal(listing.price.period, "total");
  assert.equal(listing.quality.warnings.includes("transaction_missing"), false);
});

test("recognizes conjugated vend wording in the primary title", () => {
  const html = `<!doctype html><html><head><meta property="og:title" content="Vend appartement à Palmier"></head><body><div>2 100 000 DH</div><div>120 m²</div><div>Palmier à Casablanca</div><h1>Vend appartement à Palmier</h1><script type="application/ld+json">${JSON.stringify({
    "@type": "Apartment",
    name: "Vend appartement à Palmier",
    offers: { price: "2100000" },
    address: { addressLocality: "Casablanca" },
    floorSize: { value: 120 },
    description: "Appartement lumineux avec trois chambres.",
  })}</script></body></html>`;

  const listing = extractMubawabCollectionListing(
    "https://www.mubawab.ma/fr/a/8218849/vend-appartement-a-palmier",
    html,
    "2026-09-03T18:45:00.000Z",
  );

  assert.equal(listing.transaction, "sale");
  assert.equal(listing.price.period, "total");
  assert.equal(listing.quality.warnings.includes("transaction_missing"), false);
});
