// P5A — Duplicate detection tests.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSimilarityScore, assignDuplicateGroups } from "../../../lib/listings/duplicate.js";
import type { Listing } from "../../../lib/listings/types.js";

function fakeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: `listing-${Math.random().toString(36).slice(2, 8)}`,
    title: "Appartement lumineux",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1_200_000,
    price_mad: 1_200_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 12_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "À vérifier",
    reliability_score: 60,
    is_mre_friendly: false,
    description: "Bel appartement avec terrasse",
    image_url: "",
    reliability_explanation: "",
    data_completeness_score: 70,
    ...overrides,
  };
}

describe("computeSimilarityScore - different cities", () => {
  it("returns 0 for two listings in different cities", () => {
    const a = fakeListing({ city: "Casablanca" });
    const b = fakeListing({ city: "Rabat" });
    assert.equal(computeSimilarityScore(a, b), 0);
  });
});

describe("computeSimilarityScore - near-identical listings", () => {
  it("returns >= 0.90 for two identical listings (same city, type, price, surface, bedrooms)", () => {
    const a = fakeListing({ id: "a", title: "Appartement lumineux vue mer" });
    const b = fakeListing({ id: "b", title: "Appartement lumineux vue mer" });
    const score = computeSimilarityScore(a, b);
    assert.ok(score >= 0.90, `expected >= 0.90, got ${score}`);
  });

  it("score is symmetric: score(a,b) === score(b,a)", () => {
    const a = fakeListing({ id: "a" });
    const b = fakeListing({ id: "b", price_mad: 1_250_000 });
    assert.equal(computeSimilarityScore(a, b), computeSimilarityScore(b, a));
  });
});

describe("computeSimilarityScore - different property attributes", () => {
  it("score is lower when property_type differs", () => {
    const base = fakeListing();
    const same = fakeListing({ property_type: "Appartement" });
    const diff = fakeListing({ property_type: "Villa" });
    assert.ok(computeSimilarityScore(base, same) > computeSimilarityScore(base, diff));
  });

  it("score is lower when transaction_type differs", () => {
    const base = fakeListing({ transaction_type: "buy" });
    const same = fakeListing({ transaction_type: "buy" });
    const diff = fakeListing({ transaction_type: "rent" });
    assert.ok(computeSimilarityScore(base, same) > computeSimilarityScore(base, diff));
  });

  it("price diverging > 10% reduces score", () => {
    const a = fakeListing({ price_mad: 1_000_000 });
    const b_close = fakeListing({ price_mad: 1_050_000 }); // 5% diff
    const b_far = fakeListing({ price_mad: 1_200_000 });   // 20% diff
    assert.ok(computeSimilarityScore(a, b_close) > computeSimilarityScore(a, b_far));
  });
});

describe("assignDuplicateGroups - basic grouping", () => {
  it("listings from different cities are never in the same group", () => {
    const a = fakeListing({ id: "1", city: "Casablanca" });
    const b = fakeListing({ id: "2", city: "Rabat" });
    const map = assignDuplicateGroups([a, b]);
    assert.notEqual(map.get("1")?.group_id, map.get("2")?.group_id);
  });

  it("identical listings (same city, type, price, surface) share a group", () => {
    const a = fakeListing({ id: "10" });
    const b = fakeListing({ id: "11" });
    const map = assignDuplicateGroups([a, b]);
    assert.equal(map.get("10")?.group_id, map.get("11")?.group_id);
  });

  it("group_id is stable: same input → same output", () => {
    const a = fakeListing({ id: "20" });
    const b = fakeListing({ id: "21" });
    const map1 = assignDuplicateGroups([a, b]);
    const map2 = assignDuplicateGroups([a, b]);
    assert.equal(map1.get("20")?.group_id, map2.get("20")?.group_id);
    assert.equal(map1.get("21")?.group_id, map2.get("21")?.group_id);
  });

  it("a lone listing has duplicate_score of 0", () => {
    const a = fakeListing({ id: "30", city: "Tanger" });
    const b = fakeListing({ id: "31", city: "Agadir" }); // different city
    const map = assignDuplicateGroups([a, b]);
    assert.equal(map.get("30")?.score, 0);
    assert.equal(map.get("31")?.score, 0);
  });

  it("duplicate_score is > 0 for grouped listings", () => {
    const a = fakeListing({ id: "40" });
    const b = fakeListing({ id: "41" });
    const map = assignDuplicateGroups([a, b]);
    assert.ok((map.get("40")?.score ?? 0) > 0, "score should be > 0 for grouped listing");
  });

  it("no listings are merged or removed", () => {
    const listings = [
      fakeListing({ id: "50" }),
      fakeListing({ id: "51" }),
      fakeListing({ id: "52", city: "Fès" }),
    ];
    const map = assignDuplicateGroups(listings);
    assert.equal(map.size, 3, "all listings must have an entry in the result map");
  });

  it("group representative is listing with highest data_completeness_score", () => {
    const a = fakeListing({ id: "60", data_completeness_score: 50 });
    const b = fakeListing({ id: "61", data_completeness_score: 90 });
    const map = assignDuplicateGroups([a, b]);
    // Both should be in same group, representative = "61" (higher score)
    assert.equal(map.get("60")?.group_id, "61");
    assert.equal(map.get("61")?.group_id, "61");
  });

  it("returns empty map for empty input", () => {
    const map = assignDuplicateGroups([]);
    assert.equal(map.size, 0);
  });
});

describe("assignDuplicateGroups - score thresholds", () => {
  it("duplicate_score >= 0.90 for near-identical listings", () => {
    const a = fakeListing({ id: "70", title: "Appartement vue mer Casablanca" });
    const b = fakeListing({ id: "71", title: "Appartement vue mer Casablanca" });
    const map = assignDuplicateGroups([a, b]);
    assert.ok((map.get("70")?.score ?? 0) >= 0.90);
  });
});
