import assert from "node:assert/strict";
import test from "node:test";
import {
  extractResidualPriceV4,
  parseMoneyAmountV4,
} from "../price-extraction-v4-strict-residual";

function row(overrides: Record<string, unknown> = {}) {
  return {
    seed_id: "00000000-0000-0000-0000-000000000001",
    canonical_url: "https://example.com/x",
    source_domain: "example.com",
    seed_provider: "serper_search",
    freshness_status: "fresh_confirmed",
    title: null,
    snippet: null,
    normalized_intent: null,
    ...overrides,
  } as never;
}

test("money parser handles spaced and punctuated thousands", () => {
  assert.equal(parseMoneyAmountV4("3 500"), 3500);
  assert.equal(parseMoneyAmountV4("30.000,00"), 30000);
  assert.equal(parseMoneyAmountV4("9 000 000"), 9_000_000);
});

test("Masaken accepts structured sale title with URL/title intent inference", () => {
  const match = extractResidualPriceV4(row({
    source_domain: "masaken.ma",
    seed_provider: "commoncrawl_cdx",
    freshness_status: "seed_only",
    canonical_url: "https://masaken.ma/fr/immobilier-maroc/vente-terrain-eljadida/362",
    title: "Vente terrain El Jadida 3638m² 200000 DH",
    snippet: "Vente terrain 3638 m² à El Jadida",
    normalized_intent: null,
  }));
  assert.deepEqual(match, { amount: 200_000, source: "masaken_title" });
});

test("Masaken rejects daily rent and per-m2/low sale patterns", () => {
  assert.equal(extractResidualPriceV4(row({
    source_domain: "masaken.ma",
    canonical_url: "https://masaken.ma/fr/immobilier-maroc/location-appartement-meknes/6895",
    title: "Location appartement Meknès 70m² 350 DH",
    snippet: "Proposé à 300 DH par nuit",
    normalized_intent: "rent",
  })), null);

  assert.equal(extractResidualPriceV4(row({
    source_domain: "masaken.ma",
    canonical_url: "https://masaken.ma/fr/immobilier-maroc/vente-terrain-tanger/6794",
    title: "Vente terrain Tanger 5000m² 350 DH",
    snippet: "Terrain à vendre au prix de 350 DH/m²",
    normalized_intent: "sale",
  })), null);
});

test("Mouldar accepts only strong target-specific monthly phrases", () => {
  const match = extractResidualPriceV4(row({
    source_domain: "mouldar.com",
    canonical_url: "https://mouldar.com/fr/location/appartement/casablanca/sidi-maarouf/c6edd708",
    title: "Charmant Appartement à Louer",
    snippet: "Ce bien est proposé au prix de 4 000 DH par mois.",
    normalized_intent: "rent",
  }));
  assert.deepEqual(match, { amount: 4000, source: "mouldar_strong_phrase" });

  assert.equal(extractResidualPriceV4(row({
    source_domain: "mouldar.com",
    canonical_url: "https://mouldar.com/fr/achat/terrain/rabat/souissi/59c832e2",
    snippet: "Prix 5700 DH / m² Superficie totale 2600 m²",
    normalized_intent: "sale",
  })), null);
});

test("Mubawab accepts exact title-prefix detail snippets", () => {
  const match = extractResidualPriceV4(row({
    source_domain: "mubawab.ma",
    canonical_url: "https://mubawab.ma/en/a/8322921/apartment-for-rent-in-hay-atlas",
    title: "Apartment for rent in Hay Atlas",
    snippet: "Apartment for rent in Hay Atlas. 3,500 DH. Hay Atlas in Fès. 120 m².",
    normalized_intent: "rent",
  }));
  assert.deepEqual(match, { amount: 3500, source: "mubawab_exact_prefix" });
});

test("Mubawab rejects category/related-listing snippets and daily cadence", () => {
  assert.equal(extractResidualPriceV4(row({
    source_domain: "mubawab.ma",
    canonical_url: "https://mubawab.ma/fr/is/appartement-location-rabat",
    title: "Appartement à louer",
    snippet: "Appartement à louer. Prix 9 000 DH.",
    normalized_intent: "rent",
  })), null);

  assert.equal(extractResidualPriceV4(row({
    source_domain: "mubawab.ma",
    canonical_url: "https://mubawab.ma/en/a/8364133/apartment-for-rent-in-tangier-city-center",
    title: "Apartment for Rent in Tangier City Center",
    snippet: "Apartment for Rent in Tangier City Center. 1,000 DH per day. Centre in Tanger.",
    normalized_intent: "rent",
  })), null);

  assert.equal(extractResidualPriceV4(row({
    source_domain: "mubawab.ma",
    canonical_url: "https://mubawab.ma/en/a/8004455/very-nice-apartment-for-rent",
    title: "Apartments for rent in Zenata",
    snippet: "Furnished Studio for Rent in Zenata. See ad. 6,000 DH.",
    normalized_intent: "rent",
  })), null);
});

test("unsupported provider/freshness fail closed", () => {
  assert.equal(extractResidualPriceV4(row({
    source_domain: "mouldar.com",
    seed_provider: "unknown_provider",
    canonical_url: "https://mouldar.com/fr/location/appartement/casablanca/x/c6edd708",
    snippet: "Ce bien est proposé au prix de 4 000 DH par mois.",
    normalized_intent: "rent",
  })), null);

  assert.equal(extractResidualPriceV4(row({
    source_domain: "mouldar.com",
    freshness_status: "stale",
    canonical_url: "https://mouldar.com/fr/location/appartement/casablanca/x/c6edd708",
    snippet: "Ce bien est proposé au prix de 4 000 DH par mois.",
    normalized_intent: "rent",
  })), null);
});
