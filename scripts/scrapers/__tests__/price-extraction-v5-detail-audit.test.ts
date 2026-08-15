import assert from "node:assert/strict";
import test from "node:test";
import {
  auditPriceV5Html,
  isRecognizedDetailUrlV5,
  parseMoneyAmountV5,
  type PriceV5Candidate,
} from "../price-extraction-v5-detail-audit";

function row(overrides: Partial<PriceV5Candidate> = {}): PriceV5Candidate {
  return {
    seed_id: "00000000-0000-0000-0000-000000000001",
    canonical_url: "https://www.mubawab.ma/fr/a/8322921/appartement-a-louer",
    source_domain: "mubawab.ma",
    normalized_intent: "rent",
    ...overrides,
  };
}

function page(url: string, body: string, extraHead = ""): string {
  return `<!doctype html><html><head><link rel="canonical" href="${url}">${extraHead}</head><body><main>${body}</main></body></html>`;
}

test("v5 money parser is deterministic", () => {
  assert.equal(parseMoneyAmountV5("3 500"), 3500);
  assert.equal(parseMoneyAmountV5("9.000.000,00"), 9_000_000);
  assert.equal(parseMoneyAmountV5(null), null);
});

test("recognized detail URL gate remains source-specific", () => {
  assert.equal(isRecognizedDetailUrlV5("mubawab.ma", "https://www.mubawab.ma/fr/a/8322921/x"), true);
  assert.equal(isRecognizedDetailUrlV5("mubawab.ma", "https://www.mubawab.ma/fr/is/appartement-location-rabat"), false);
  assert.equal(isRecognizedDetailUrlV5("mouldar.com", "https://mouldar.com/fr/location/appartement/rabat/x/c6edd708"), true);
  assert.equal(isRecognizedDetailUrlV5("agenz.ma", "https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/12345"), true);
});

test("canonical JSON-LD Offer in MAD is reliable", () => {
  const url = "https://www.mubawab.ma/fr/a/8322921/appartement-a-louer";
  const html = page(
    url,
    "<h1>Appartement à louer</h1>",
    `<script type="application/ld+json">${JSON.stringify({
      "@type": "Apartment",
      url,
      offers: { "@type": "Offer", price: "8500", priceCurrency: "MAD" },
    })}</script>`,
  );
  assert.deepEqual(auditPriceV5Html(html, row({ canonical_url: url })), {
    reliable: { amount: 8500, signal: "jsonld_canonical_offer" },
    generic_high_amount: null,
    canonical_identity: true,
  });
});

test("JSON-LD wrong currency or wrong node URL is rejected", () => {
  const url = "https://www.mubawab.ma/fr/a/8322921/appartement-a-louer";
  const html = page(
    url,
    "<h1>Appartement à louer</h1>",
    `<script type="application/ld+json">${JSON.stringify({
      "@type": "Apartment",
      url: "https://www.mubawab.ma/fr/a/9999999/autre-annonce",
      offers: { "@type": "Offer", price: "8500", priceCurrency: "EUR" },
    })}</script>`,
  );
  assert.equal(auditPriceV5Html(html, row({ canonical_url: url })).reliable, null);
});

test("canonical product price metadata in MAD is reliable", () => {
  const url = "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/12345";
  const html = page(
    url,
    "<h1>Appartement à vendre</h1>",
    '<meta property="product:price:amount" content="2350000"><meta property="product:price:currency" content="MAD">',
  );
  const audited = auditPriceV5Html(html, row({
    canonical_url: url,
    source_domain: "agenz.ma",
    normalized_intent: "sale",
  }));
  assert.deepEqual(audited.reliable, { amount: 2_350_000, signal: "meta_canonical_price" });
});

test("Mouldar primary strong phrase is accepted but per-m2 is rejected", () => {
  const url = "https://mouldar.com/fr/location/appartement/casablanca/x/c6edd708";
  const accepted = auditPriceV5Html(
    page(url, "<h1>Appartement</h1><p>Ce bien est proposé au prix de 4 000 DH par mois.</p>"),
    row({ canonical_url: url, source_domain: "mouldar.com" }),
  );
  assert.deepEqual(accepted.reliable, { amount: 4000, signal: "mouldar_primary_phrase" });

  const rejected = auditPriceV5Html(
    page(url, "<h1>Terrain</h1><p>Ce bien est proposé au prix de 5 700 DH / m².</p>"),
    row({ canonical_url: url, source_domain: "mouldar.com", normalized_intent: "sale" }),
  );
  assert.equal(rejected.reliable, null);
});

test("Masaken H1 terminal amount is accepted", () => {
  const url = "https://masaken.ma/fr/immobilier-maroc/vente-terrain-eljadida/362";
  const audited = auditPriceV5Html(
    page(url, "<h1>Vente terrain El Jadida 3638m² 200000 DH</h1>"),
    row({ canonical_url: url, source_domain: "masaken.ma", normalized_intent: "sale" }),
  );
  assert.deepEqual(audited.reliable, { amount: 200_000, signal: "masaken_h1_price" });
});

test("canonical mismatch prevents metadata promotion", () => {
  const target = "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/12345";
  const html = page(
    "https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/67890",
    "<h1>Autre annonce</h1>",
    '<meta property="product:price:amount" content="2350000"><meta property="product:price:currency" content="MAD">',
  );
  const audited = auditPriceV5Html(html, row({ canonical_url: target, source_domain: "agenz.ma", normalized_intent: "sale" }));
  assert.equal(audited.canonical_identity, false);
  assert.equal(audited.reliable, null);
});
