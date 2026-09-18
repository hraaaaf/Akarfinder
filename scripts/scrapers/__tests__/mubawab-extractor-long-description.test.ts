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

test("recognizes explicit location longue durée wording as rent", () => {
  const html = `<!doctype html><html><head><meta property="og:title" content="Studio neuf aux princesses"></head><body><div>8 000 DH</div><div>49 m²</div><div>Les princesses à Casablanca</div><h1>Studio neuf aux princesses</h1><script type="application/ld+json">${JSON.stringify({
    "@type": "Apartment",
    name: "Studio neuf aux princesses",
    offers: { price: "8000" },
    address: { addressLocality: "Casablanca", streetAddress: "Les princesses" },
    floorSize: { value: 49 },
    description: "Studio neuf de 49m carré pour location longue durée. 2 façades, est et ouest. 2 balcons. Syndic inclus.",
  })}</script></body></html>`;

  const listing = extractMubawabCollectionListing(
    "https://www.mubawab.ma/fr/a/8391927/studio-neuf-aux-princesses",
    html,
    "2026-09-03T18:45:00.000Z",
  );

  assert.equal(listing.transaction, "rent");
  assert.equal(listing.price.period, "month");
  assert.equal(listing.quality.warnings.includes("transaction_missing"), false);
});

test("recognizes maison à acheter in the primary title as sale", () => {
  const html = `<!doctype html><html><head><meta property="og:title" content="Maison à acheter à Dar Touzani"></head><body><div>20 000 000 DH</div><div>256 m²</div><div>Dar Touzani à Casablanca</div><h1>Maison à acheter à Dar Touzani</h1><script type="application/ld+json">${JSON.stringify({
    "@type": "House",
    name: "Maison à acheter à Dar Touzani",
    offers: { price: "20000000" },
    address: { addressLocality: "Casablanca", streetAddress: "Dar Touzani" },
    floorSize: { value: 256 },
    description: "Maison familiale avec façade moderne.",
  })}</script></body></html>`;
  const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8407067/maison-a-acheter-a-dar-touzani", html, "2026-09-03T18:45:00.000Z");
  assert.equal(listing.transaction, "sale");
  assert.equal(listing.price.period, "total");
});

test("recognizes pour location meublé in the primary description as rent", () => {
  const html = `<!doctype html><html><head><meta property="og:title" content="Belle villa meublé près Naershore sidi maarouf"></head><body><div>22 000 DH</div><div>350 m²</div><div>Sidi Maarouf à Casablanca</div><h1>Belle villa meublé près Naershore sidi maarouf</h1><script type="application/ld+json">${JSON.stringify({
    "@type": "House",
    name: "Belle villa meublé près Naershore sidi maarouf",
    offers: { price: "22000" },
    address: { addressLocality: "Casablanca", streetAddress: "Sidi Maarouf" },
    floorSize: { value: 350 },
    description: "Serraj immobilier vous propose une villa pour location meublé entièrement.",
  })}</script></body></html>`;
  const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8303206/belle-villa-meuble", html, "2026-09-03T18:45:00.000Z");
  assert.equal(listing.transaction, "rent");
  assert.equal(listing.price.period, "month");
});

test("recognizes magasin pour la location in the primary description as rent", () => {
  const html = `<!doctype html><html><head><meta property="og:title" content="Local commercial de 450m² à Agdal idéal pour superette"></head><body><div>50 000 DH</div><div>500 m²</div><div>Agdal à Rabat</div><h1>Local commercial de 450m² à Agdal idéal pour superette</h1><script type="application/ld+json">${JSON.stringify({
    "@type": "Product",
    name: "Local commercial de 450m² à Agdal idéal pour superette",
    offers: { price: "50000" },
    address: { addressLocality: "Rabat", streetAddress: "Agdal" },
    floorSize: { value: 500 },
    description: "Magasin pour la location bien situé à Agdal, idéal pour une supérette.",
  })}</script></body></html>`;
  const listing = extractMubawabCollectionListing("https://www.mubawab.ma/fr/a/8332692/local-commercial-agdal", html, "2026-09-03T18:45:00.000Z");
  assert.equal(listing.transaction, "rent");
  assert.equal(listing.price.period, "month");
});
