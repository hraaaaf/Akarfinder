// Unit tests: plausible price rejection + mergeDetail no-overwrite guarantee.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePrice } from "../normalizers/normalize-price.js";
import { mergeDetail, computeCompleteness } from "../sources/_shared.js";
import type { DetailFields, DetailFieldConfidence } from "../utils/extract.js";
import type { ScrapedListingP0 } from "../types.js";

// Re-implement the plausible-price gate for black-box testing
// (matching the implementation in _shared.ts).
function plausiblePrice(n: number | null): number | null {
  return n != null && n >= 1000 ? n : null;
}

describe("plausible price rejection", () => {
  it("'9' normalizes and is rejected (< 1000)", () => {
    const raw = "9";
    const n = normalizePrice(raw);
    assert.equal(plausiblePrice(n), null, "price 9 should be rejected");
  });

  it("'600 000 DH' survives", () => {
    const n = normalizePrice("600 000 DH");
    assert.equal(plausiblePrice(n), 600000);
  });

  it("'5 000 MAD/mois' survives", () => {
    const n = normalizePrice("5 000 MAD/mois");
    assert.equal(plausiblePrice(n), 5000);
  });

  it("'999' is rejected", () => {
    assert.equal(plausiblePrice(normalizePrice("999")), null);
  });

  it("'1000' is accepted", () => {
    assert.equal(plausiblePrice(normalizePrice("1000")), 1000);
  });
});

function makeDetail(overrides: Partial<DetailFields> = {}): DetailFields {
  const conf: DetailFieldConfidence = {
    price: "missing",
    city: "missing",
    district: "missing",
    surface: "missing",
    rooms: "missing",
    bedrooms: "missing",
    bathrooms: "missing",
    description: "missing",
    seller: "missing",
  };
  return {
    price_raw: null,
    city: null,
    district: null,
    surface_raw: null,
    rooms: null,
    bedrooms: null,
    bathrooms: null,
    description_snippet: null,
    seller_name: null,
    images_count: null,
    location_candidates: [],
    _confidence: conf,
    ...overrides,
  };
}

function makeListing(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: "https://mubawab.ma/fr/a/test",
    title: "Test",
    price_raw: "500 000 DH",
    price_mad: 500000,
    city: "Rabat",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: null,
    surface_m2: null,
    rooms_count: null,
    bedrooms_count: null,
    bathrooms: null,
    description_snippet: null,
    images_count: null,
    seller_name: null,
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 0,
    field_confidence: {
      price: "medium", city: "medium", district: "missing", surface: "missing",
      rooms: "missing", bedrooms: "missing", bathrooms: "missing",
      description: "missing", seller: "missing",
    },
    ...overrides,
  };
}

describe("mergeDetail — no-overwrite guarantee", () => {
  it("does not overwrite a reliable index-phase city with a null detail city", () => {
    const listing = makeListing({ city: "Rabat" });
    const detail = makeDetail({ city: null });
    mergeDetail(listing, detail);
    assert.equal(listing.city, "Rabat", "city should not be overwritten by null");
  });

  it("does not overwrite an existing price_mad with a null detail price", () => {
    const listing = makeListing({ price_mad: 500000 });
    const detail = makeDetail({ price_raw: null });
    mergeDetail(listing, detail);
    assert.equal(listing.price_mad, 500000);
  });

  it("fills missing fields from detail", () => {
    const listing = makeListing({ surface_m2: null, bedrooms_count: null });
    const detail = makeDetail({ surface_raw: "90 m²", bedrooms: 3 });
    detail._confidence.surface = "medium";
    detail._confidence.bedrooms = "medium";
    mergeDetail(listing, detail);
    assert.equal(listing.surface_m2, 90);
    assert.equal(listing.bedrooms_count, 3);
  });

  it("does not overwrite rooms_count from detail if already set", () => {
    const listing = makeListing({ rooms_count: 4 });
    const detail = makeDetail({ rooms: 2 });
    mergeDetail(listing, detail);
    assert.equal(listing.rooms_count, 4, "existing rooms_count must not be overwritten");
  });

  it("updates data_completeness_score after merge", () => {
    const listing = makeListing({ surface_m2: null, bedrooms_count: null, bathrooms: null });
    const before = computeCompleteness(listing);
    const detail = makeDetail({ surface_raw: "75 m²", bedrooms: 2, bathrooms: 1 });
    mergeDetail(listing, detail);
    assert.ok(
      listing.data_completeness_score > before,
      "score should improve after merging missing fields"
    );
  });
});
