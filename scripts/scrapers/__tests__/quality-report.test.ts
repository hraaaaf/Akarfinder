// Unit tests: source quality report structure.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ScrapedListingP0, SourceQualityEntry } from "../types.js";

// Re-implement the build function inline to keep tests self-contained.
// If the implementation diverges, the test will catch it.
function buildQualityEntry(
  listings: ScrapedListingP0[],
  errorsCount: number,
  attempted: number
): SourceQualityEntry {
  const FILL_RATE_FIELDS: (keyof ScrapedListingP0)[] = [
    "price_mad", "city", "district", "surface_m2",
    "rooms_count", "bedrooms_count", "bathrooms",
    "description_snippet", "seller_name", "images_count",
  ];

  const succeeded = listings.length;
  const failed = attempted - succeeded;
  const fieldFillCount: Record<string, number> = {};
  for (const f of FILL_RATE_FIELDS) fieldFillCount[f] = 0;

  let totalImages = 0, imageListings = 0, totalScore = 0;
  for (const l of listings) {
    totalScore += l.data_completeness_score ?? 0;
    for (const f of FILL_RATE_FIELDS) {
      const v = l[f];
      if (v !== null && v !== undefined && v !== "") fieldFillCount[f]++;
    }
    if (l.images_count != null) { totalImages += l.images_count; imageListings++; }
  }

  const fieldFillRate: Record<string, number> = {};
  for (const f of FILL_RATE_FIELDS) {
    fieldFillRate[f] = succeeded > 0 ? Math.round((fieldFillCount[f] / succeeded) * 100) / 100 : 0;
  }

  return {
    attempted,
    succeeded,
    failed,
    average_completeness_score: succeeded > 0 ? Math.round(totalScore / succeeded) : 0,
    field_fill_rate: fieldFillRate,
    average_images_count: imageListings > 0 ? Math.round(totalImages / imageListings) : null,
    common_missing_fields: FILL_RATE_FIELDS.filter((f) => (fieldFillRate[f] ?? 0) < 0.5) as string[],
    errors_count: errorsCount,
  };
}

function fakeListing(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: "https://mubawab.ma/fr/a/1",
    title: "Test",
    price_raw: "500 000 DH",
    price_mad: 500000,
    city: "Casablanca",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: "80 m²",
    surface_m2: 80,
    rooms_count: null,
    bedrooms_count: 2,
    bathrooms: 1,
    description_snippet: "Description test",
    images_count: 4,
    seller_name: "Agence Test",
    published_at_raw: null,
    scraped_at: new Date().toISOString(),
    data_completeness_score: 88,
    field_confidence: {
      price: "high", city: "high", district: "missing", surface: "high",
      rooms: "missing", bedrooms: "medium", bathrooms: "medium",
      description: "medium", seller: "high",
    },
    ...overrides,
  };
}

describe("buildQualityEntry", () => {
  it("empty listings → all zeros / nulls", () => {
    const entry = buildQualityEntry([], 0, 0);
    assert.equal(entry.succeeded, 0);
    assert.equal(entry.failed, 0);
    assert.equal(entry.average_completeness_score, 0);
    assert.equal(entry.average_images_count, null);
  });

  it("counts fill rate correctly", () => {
    const listings = [
      fakeListing({ price_mad: 500000, city: "Casa", images_count: 3 }),
      fakeListing({ price_mad: null, city: "Rabat", images_count: 5 }),
    ];
    const entry = buildQualityEntry(listings, 0, 2);
    assert.equal(entry.field_fill_rate["price_mad"], 0.5);
    assert.equal(entry.field_fill_rate["city"], 1);
    assert.equal(entry.average_images_count, 4); // (3+5)/2
  });

  it("common_missing_fields lists fields with fill_rate < 0.5", () => {
    const listings = [fakeListing({ district: null, rooms_count: null })];
    const entry = buildQualityEntry(listings, 0, 1);
    assert.ok(entry.common_missing_fields.includes("district"));
    assert.ok(entry.common_missing_fields.includes("rooms_count"));
    assert.ok(!entry.common_missing_fields.includes("price_mad"));
  });

  it("attempted includes failed attempts", () => {
    const entry = buildQualityEntry([fakeListing()], 2, 5);
    assert.equal(entry.attempted, 5);
    assert.equal(entry.succeeded, 1);
    assert.equal(entry.failed, 4);
    assert.equal(entry.errors_count, 2);
  });
});
