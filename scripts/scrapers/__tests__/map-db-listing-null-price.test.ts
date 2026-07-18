import assert from "node:assert/strict";
import test from "node:test";

import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import type { DbListingRow } from "../../../lib/listings/db-listings.js";

// Regression test — AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1.
// A real bug was found live in Production: a listing with price_mad = NULL
// in the database (a legitimate "price not disclosed" OpenSERP result) was
// serialized as price: 0 / price_per_m2: 0 in the public /api/search JSON,
// violating the hard "never fabricate a price" rule. The public /search
// page itself stayed safe (formatPrice() already treats <= 0 as "not
// disclosed"), but the raw API contract was still wrong, and any other
// consumer without that same defensive check would not have been safe.
// This locks in the fix: null must survive all the way through to the
// public Listing object, never coerced to 0.

function minimalDbRow(overrides: Partial<DbListingRow>): DbListingRow {
  return {
    id: 1,
    canonical_fingerprint: "fp-1",
    title: "Appartement test",
    price_mad: null,
    city: "Rabat",
    district: null,
    property_type: "apartment",
    transaction_type: "sale",
    surface_m2: 80,
    rooms_count: null,
    bedrooms_count: 2,
    bathrooms_count: null,
    description_snippet: null,
    images_count: null,
    thumbnail_url: null,
    seller_name: null,
    data_completeness_score: 50,
    field_confidence: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    duplicate_group_id: null,
    duplicate_score: null,
    reliability_score: null,
    reliability_badge: null,
    reliability_reasons: null,
    built_surface_m2: null,
    plot_surface_m2: null,
    condition: null,
    property_age_range: null,
    orientation: null,
    floor_type: null,
    floors_count: null,
    garden_m2: null,
    terrace_m2: null,
    garage_spaces: null,
    has_pool: null,
    has_concierge: null,
    has_moroccan_living_room: null,
    has_european_living_room: null,
    has_equipped_kitchen: null,
    premium_features: null,
    source_name: "mubawab",
    listing_url: "https://mubawab.ma/x",
    source_url: "https://mubawab.ma/x",
    ...overrides,
  } as DbListingRow;
}

test("mapDbRowToListing never coerces a null price_mad to 0", () => {
  const row = minimalDbRow({ price_mad: null });
  const listing = mapDbRowToListing(row);
  assert.equal(listing.price, null);
  assert.equal(listing.price_mad, null);
});

test("mapDbRowToListing never coerces price_per_m2 to 0 when price is unknown", () => {
  const row = minimalDbRow({ price_mad: null, surface_m2: 80 });
  const listing = mapDbRowToListing(row);
  assert.equal(listing.price_per_m2, null);
});

test("mapDbRowToListing preserves a real, disclosed price unchanged", () => {
  const row = minimalDbRow({ price_mad: 850000, surface_m2: 85 });
  const listing = mapDbRowToListing(row);
  assert.equal(listing.price, 850000);
  assert.equal(listing.price_mad, 850000);
  assert.equal(listing.price_per_m2, Math.round(850000 / 85));
});
