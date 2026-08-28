import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStructuredDistrictCountFilter } from "../../lib/search/structured-district-total";

test("district total filter canonicalizes geography and mirrors DB structured filters", () => {
  const filter = buildStructuredDistrictCountFilter({
    city: "Rabat",
    district: "Les Orangers",
    property_type: "Appartement",
    transaction_type: "buy",
    min_price: 1_000_000,
    max_price: 3_000_000,
    min_surface: 80,
    max_surface: 160,
  });

  assert.ok(filter);
  assert.equal(filter.district, "Les Orangers");
  assert.ok(filter.cityVariants.includes("Rabat"));
  assert.equal(filter.property_type, "apartment");
  assert.equal(filter.transaction_type, "sale");
  assert.equal(filter.min_price, 1_000_000);
  assert.equal(filter.max_price, 3_000_000);
  assert.equal(filter.min_surface, 80);
  assert.equal(filter.max_surface, 160);
});

test("district total filter requires both city and district to avoid cross-city counts", () => {
  assert.equal(buildStructuredDistrictCountFilter({ city: "Rabat" }), null);
  assert.equal(buildStructuredDistrictCountFilter({ district: "Agdal" }), null);
  assert.equal(buildStructuredDistrictCountFilter({}), null);
});

test("district total filter mirrors transaction and property aliases used by Supabase listings", () => {
  const filter = buildStructuredDistrictCountFilter({
    city: "Rabat",
    district: "Agdal",
    property_type: "Bureau",
    transaction_type: "location",
  });

  assert.ok(filter);
  assert.equal(filter.property_type, "office");
  assert.equal(filter.transaction_type, "rent");
});
