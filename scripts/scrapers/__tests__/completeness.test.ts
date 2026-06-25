// Unit tests: computeCompleteness and computeFieldConfidence.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeCompleteness, computeFieldConfidence } from "../sources/_shared.js";
import type { ScrapedListingP0 } from "../types.js";

function baseListing(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: "https://mubawab.ma/fr/a/test",
    title: "Appartement Casablanca",
    price_raw: "600 000 DH",
    price_mad: 600000,
    city: "Casablanca",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: "80 m²",
    surface_m2: 80,
    rooms_count: null,
    bedrooms_count: 2,
    bathrooms: 1,
    description_snippet: "Bel appartement",
    images_count: 5,
    seller_name: "Agence XYZ",
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 0,
    field_confidence: {
      price: "missing",
      city: "missing",
      district: "missing",
      surface: "missing",
      rooms: "missing",
      bedrooms: "missing",
      bathrooms: "missing",
      description: "missing",
      seller: "missing",
    },
    ...overrides,
  };
}

describe("computeCompleteness", () => {
  it("all 8 fields present → 100", () => {
    const l = baseListing({ district: "Maarif" });
    assert.equal(computeCompleteness(l), 100);
  });

  it("district missing → 87 (7/8)", () => {
    const l = baseListing(); // district is null
    assert.equal(computeCompleteness(l), 88); // 7/8 = 87.5 → rounds to 88
  });

  it("price_mad and seller_name missing → 63 (5/8 present: city,surface,bedrooms,bathrooms,description)", () => {
    // baseListing already has district=null, so: city✓ surface✓ bedrooms✓ bathrooms✓ description✓ = 5/8 = 62.5→63
    const l = baseListing({ price_mad: null, seller_name: null });
    assert.equal(computeCompleteness(l), 63);
  });

  it("all fields null → 0", () => {
    const l = baseListing({
      price_mad: null,
      city: null,
      district: null,
      surface_m2: null,
      bedrooms_count: null,
      bathrooms: null,
      description_snippet: null,
      seller_name: null,
    });
    assert.equal(computeCompleteness(l), 0);
  });
});

describe("computeFieldConfidence", () => {
  it("null fields → 'missing'", () => {
    const l = baseListing({ price_mad: null, city: null });
    const conf = computeFieldConfidence(l);
    assert.equal(conf.price, "missing");
    assert.equal(conf.city, "missing");
  });

  it("present fields without detail confidence → 'medium'", () => {
    const l = baseListing();
    const conf = computeFieldConfidence(l);
    assert.equal(conf.price, "medium"); // price_mad present, no detail conf passed
    assert.equal(conf.city, "medium");
  });

  it("detail confidence 'high' overrides default 'medium'", () => {
    const l = baseListing();
    const conf = computeFieldConfidence(l, { price: "high", city: "high" });
    assert.equal(conf.price, "high");
    assert.equal(conf.city, "high");
  });

  it("detail confidence 'missing' for a present field → falls back to 'medium'", () => {
    // If the field is set on the listing but detail says missing, it came from index phase
    const l = baseListing();
    const conf = computeFieldConfidence(l, { price: "missing" });
    // price_mad is set, detailConf.price is "missing", so pick returns "medium"
    assert.equal(conf.price, "medium");
  });
});
