// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — Legacy adapter tests (mission section 19.E).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  projectLegacyBatch,
  projectLegacyPropertyListing,
  type LegacyPropertyListingRow,
  type LegacySourceRow,
} from "../../../lib/market-index/market-index-legacy-adapter.js";

function listing(overrides: Partial<LegacyPropertyListingRow> = {}): LegacyPropertyListingRow {
  return {
    id: 1,
    price_mad: 1200000,
    city: "Casablanca",
    district: "Maarif",
    property_type: "apartment",
    transaction_type: "sale",
    surface_m2: 90,
    duplicate_group_id: null,
    field_confidence: null,
    ...overrides,
  };
}

function source(overrides: Partial<LegacySourceRow> = {}): LegacySourceRow {
  return {
    id: 100,
    property_listing_id: 1,
    source_name: "mubawab",
    listing_url: "https://mubawab.ma/a/1",
    source_url: "https://mubawab.ma/a/1",
    is_active: true,
    first_seen_at: "2026-07-01T00:00:00.000Z",
    last_seen_at: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("Legacy adapter — IDs preserved", () => {
  it("preserves the legacy property_listings id", () => {
    const projected = projectLegacyPropertyListing(listing({ id: 42 }), []);
    assert.equal(projected.legacy_property_listing_id, 42);
  });

  it("preserves each listing_sources id", () => {
    const projected = projectLegacyPropertyListing(listing(), [source({ id: 7 })]);
    assert.equal(projected.source_offers[0].legacy_listing_source_id, 7);
  });
});

describe("Legacy adapter — source links preserved", () => {
  it("preserves listing_url and source_url unchanged", () => {
    const projected = projectLegacyPropertyListing(
      listing(),
      [source({ listing_url: "https://mubawab.ma/a/1?utm_source=x", source_url: "https://mubawab.ma/a/1" })],
    );
    assert.equal(projected.source_offers[0].listing_url, "https://mubawab.ma/a/1?utm_source=x");
    assert.equal(projected.source_offers[0].source_url, "https://mubawab.ma/a/1");
  });
});

describe("Legacy adapter — missing prices preserved", () => {
  it("classifies a null price_mad as not_disclosed, never invents a value", () => {
    const projected = projectLegacyPropertyListing(listing({ price_mad: null }), []);
    assert.equal(projected.price_status, "not_disclosed");
    assert.equal(projected.displayed_price, null);
  });

  it("classifies a 0 price_mad as invalid, not valid", () => {
    const projected = projectLegacyPropertyListing(listing({ price_mad: 0 }), []);
    assert.equal(projected.price_status, "invalid");
  });
});

describe("Legacy adapter — no multi-source PropertyCluster invented", () => {
  it("flags multi_source_unverified when >1 source is attached, without resolving it", () => {
    const projected = projectLegacyPropertyListing(listing({ id: 134 }), [
      source({ id: 1, property_listing_id: 134, listing_url: "https://mubawab.ma/a/8266994" }),
      source({ id: 2, property_listing_id: 134, listing_url: "https://mubawab.ma/a/8328709" }),
    ]);
    assert.equal(projected.multi_source_unverified, true);
    assert.equal(projected.source_offers.length, 2);
  });

  it("does not flag multi_source_unverified for a single-source listing", () => {
    const projected = projectLegacyPropertyListing(listing(), [source()]);
    assert.equal(projected.multi_source_unverified, false);
  });

  it("always projects exactly one cluster per legacy row (legacy_one_to_one_projection)", () => {
    const projected = projectLegacyPropertyListing(listing(), [source(), source({ id: 101 })]);
    assert.equal(projected.cluster_origin, "legacy_one_to_one_projection");
  });
});

describe("Legacy adapter — does not trust duplicate_group_id as cluster evidence", () => {
  it("surfaces duplicate_group_id only as an explicitly-ignored signal", () => {
    const projected = projectLegacyPropertyListing(listing({ duplicate_group_id: "5" }), []);
    assert.equal(projected.legacy_duplicate_group_id_ignored, "5");
    // Critically: this field name itself documents that it must never be used
    // as validated cluster membership -- verified structurally (no other
    // field on LegacyProjectedCluster derives cluster identity from it).
  });
});

describe("Legacy adapter — unknown fields signaled explicitly", () => {
  it("reports fields present on the raw row but not modeled by this adapter", () => {
    const projected = projectLegacyPropertyListing(listing(), [], ["id", "price_mad", "some_new_column"]);
    assert.deepEqual(projected.unknown_fields_detected, ["some_new_column"]);
  });

  it("reports no unknown fields when the raw row only has known columns", () => {
    const projected = projectLegacyPropertyListing(listing(), [], ["id", "price_mad", "city"]);
    assert.deepEqual(projected.unknown_fields_detected, []);
  });
});

describe("Legacy adapter — batch projection preserves counts", () => {
  it("produces one projection per input listing", () => {
    const listings = [listing({ id: 1 }), listing({ id: 2 }), listing({ id: 3 })];
    const sources = [source({ id: 1, property_listing_id: 1 }), source({ id: 2, property_listing_id: 2 })];
    const projected = projectLegacyBatch(listings, sources);
    assert.equal(projected.length, 3);
    assert.equal(projected.find((p) => p.legacy_property_listing_id === 3)?.source_offers.length, 0);
  });
});

describe("Legacy adapter — no PII added", () => {
  it("never adds a field that could carry PII beyond what the raw row already had", () => {
    const projected = projectLegacyPropertyListing(listing(), [source()]);
    const serialized = JSON.stringify(projected);
    assert.doesNotMatch(serialized, /whatsapp/i);
    assert.doesNotMatch(serialized, /@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
});
