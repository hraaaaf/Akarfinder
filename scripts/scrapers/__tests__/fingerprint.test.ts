// Unit tests: canonical fingerprint builder.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCanonicalFingerprint } from "../utils/fingerprint.js";
import type { ScrapedListingP0 } from "../types.js";

function base(overrides: Partial<ScrapedListingP0> = {}): ScrapedListingP0 {
  return {
    source_name: "mubawab",
    source_url: "https://mubawab.ma",
    listing_url: "https://mubawab.ma/fr/a/1",
    title: "Appartement Casablanca",
    price_raw: "1 300 000 DH",
    price_mad: 1_300_000,
    city: "Casablanca",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_raw: "120 m²",
    surface_m2: 120,
    rooms_count: null,
    bedrooms_count: 3,
    bathrooms: 2,
    description_snippet: "Bel appartement",
    images_count: 5,
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

describe("buildCanonicalFingerprint", () => {
  it("produces the expected format", () => {
    const fp = buildCanonicalFingerprint(base());
    assert.equal(fp, "casablanca|apartment|sale|price_1300000|surface_120|bedrooms_3");
  });

  it("is stable: same listing → same fingerprint every call", () => {
    const l = base();
    assert.equal(buildCanonicalFingerprint(l), buildCanonicalFingerprint(l));
  });

  it("is stable across two equivalent listings (same logical property)", () => {
    const a = base({ listing_url: "https://mubawab.ma/fr/a/1" });
    const b = base({ listing_url: "https://mubawab.ma/fr/a/2" });
    assert.equal(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("price bucketing: 1 295 000 and 1 305 000 map to same bucket (1 300 000)", () => {
    const a = base({ price_mad: 1_295_000 });
    const b = base({ price_mad: 1_305_000 });
    assert.equal(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("price bucketing: 1 280 000 and 1 330 000 land in different buckets", () => {
    const a = base({ price_mad: 1_280_000 });
    const b = base({ price_mad: 1_330_000 });
    assert.notEqual(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("surface bucketing: 118 and 122 map to same bucket (120)", () => {
    const a = base({ surface_m2: 118 });
    const b = base({ surface_m2: 122 });
    assert.equal(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("surface bucketing: 110 and 130 land in different buckets", () => {
    const a = base({ surface_m2: 110 });
    const b = base({ surface_m2: 130 });
    assert.notEqual(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("different city → different fingerprint", () => {
    const a = base({ city: "Casablanca" });
    const b = base({ city: "Rabat" });
    assert.notEqual(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("different property_type → different fingerprint", () => {
    const a = base({ property_type: "apartment" });
    const b = base({ property_type: "villa" });
    assert.notEqual(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("different transaction_type → different fingerprint", () => {
    const a = base({ transaction_type: "sale" });
    const b = base({ transaction_type: "rent" });
    assert.notEqual(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("different bedrooms_count → different fingerprint", () => {
    const a = base({ bedrooms_count: 2 });
    const b = base({ bedrooms_count: 4 });
    assert.notEqual(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("null price_mad → uses 'price_null' token", () => {
    const fp = buildCanonicalFingerprint(base({ price_mad: null }));
    assert.ok(fp.includes("|price_null|"), `expected price_null in: ${fp}`);
  });

  it("null surface_m2 → uses 'surface_null' token", () => {
    const fp = buildCanonicalFingerprint(base({ surface_m2: null }));
    assert.ok(fp.includes("|surface_null|"), `expected surface_null in: ${fp}`);
  });

  it("null city → uses 'unknown' token", () => {
    const fp = buildCanonicalFingerprint(base({ city: null }));
    assert.ok(fp.startsWith("unknown|"), `expected unknown| prefix in: ${fp}`);
  });

  it("accent normalisation: 'Fès' and 'Fes' produce same fingerprint", () => {
    const a = base({ city: "Fès" });
    const b = base({ city: "Fes" });
    assert.equal(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });

  it("case insensitive city: 'CASABLANCA' and 'Casablanca' are equal", () => {
    const a = base({ city: "CASABLANCA" });
    const b = base({ city: "Casablanca" });
    assert.equal(buildCanonicalFingerprint(a), buildCanonicalFingerprint(b));
  });
});
