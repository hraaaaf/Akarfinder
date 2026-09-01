import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeType } from "../normalizers/normalize-type.js";
import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import type { DbListingRow } from "../../../lib/listings/db-listings.js";

function row(propertyType: string, title: string): DbListingRow {
  return {
    id: 1, canonical_fingerprint: "cert-property-type", title, price_mad: 1000000,
    city: "Marrakech", district: null, property_type: propertyType, transaction_type: "sale",
    surface_m2: 300, rooms_count: null, bedrooms_count: null, bathrooms_count: null,
    description_snippet: null, images_count: null, thumbnail_url: null, seller_name: null,
    data_completeness_score: 80, field_confidence: null, created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z", duplicate_group_id: "cert-property-type",
    duplicate_score: 0, reliability_score: 80, reliability_badge: "Bonne", reliability_reasons: "[]",
    built_surface_m2: null, plot_surface_m2: null, condition: null, property_age_range: null,
    orientation: null, floor_type: null, floors_count: null, garden_m2: null, terrace_m2: null,
    garage_spaces: null, has_pool: 0, has_concierge: 0, has_moroccan_living_room: 0,
    has_european_living_room: 0, has_equipped_kitchen: 0, premium_features: null,
    source_name: "mubawab", listing_url: "https://example.test/listing", source_url: "https://example.test",
  };
}

describe("property type semantic precedence", () => {
  it("classifies the LIVE Terrain pour villa case as land", () => {
    assert.equal(normalizeType("Terrain pour villa à sonaba agadir"), "land");
  });
  it("keeps a real villa when villa is the primary title concept", () => {
    assert.equal(normalizeType("Villa à rénover en vente à Hay Riad – 741 m² terrain"), "villa");
  });
  it("classifies terrain before contextual villa mentions", () => {
    assert.equal(normalizeType("Terrain titré 12H zone permettant 4 villas maximum par hectare"), "land");
  });
  it("preserves Riad as its own property type", () => {
    assert.equal(normalizeType("Riad A vendre Guéliz 8 chambres et piscine"), "riad");
    assert.equal(normalizeType("Type de bien riad"), "riad");
    assert.equal(mapDbRowToListing(row("riad", "Riad à vendre")).property_type, "Riad");
  });
});
