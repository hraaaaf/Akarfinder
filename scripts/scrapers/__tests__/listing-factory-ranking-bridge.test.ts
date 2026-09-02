import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareRecommendedListings,
  computeRankingBreakdown,
} from "../../../lib/search/ranking.js";
import type { Listing } from "../../../lib/listings/types.js";

function listing(id: string, overrides: Partial<Listing> & { ranking_quality_score?: number | null } = {}): Listing {
  return {
    id,
    title: "Appartement Agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    district: "Agdal",
    price: 1_500_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 15_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 80,
    is_mre_friendly: false,
    description: "Appartement lumineux à Agdal",
    image_url: "",
    reliability_explanation: "",
    description_snippet: "Appartement lumineux à Agdal",
    ...overrides,
  } as Listing;
}

describe("Listing Factory V1 ranking bridge", () => {
  it("uses ranking_quality_score only as the third lexicographic layer", () => {
    const high = listing("high", { ranking_quality_score: 96 } as Partial<Listing>);
    const low = listing("low", { ranking_quality_score: 60 } as Partial<Listing>);
    const query = { city: "Rabat", property_type: "Appartement", transaction_type: "buy" };

    const highRank = computeRankingBreakdown(high, query);
    const lowRank = computeRankingBreakdown(low, query);

    assert.equal(highRank.relevance, lowRank.relevance);
    assert.equal(highRank.hasDisclosedPrice, lowRank.hasDisclosedPrice);
    assert.equal(highRank.qualitySource, "listing_factory_v1");
    assert.equal(lowRank.qualitySource, "listing_factory_v1");
    assert.ok(compareRecommendedListings(high, low, query) < 0);
  });

  it("never lets perfect quality outrank materially stronger relevance", () => {
    const exact = listing("exact", { city: "Rabat", ranking_quality_score: 10 } as Partial<Listing>);
    const wrongCity = listing("wrong", { city: "Casablanca", ranking_quality_score: 100 } as Partial<Listing>);
    const query = { city: "Rabat" };

    assert.ok(compareRecommendedListings(exact, wrongCity, query) < 0);
  });

  it("keeps disclosed price above quality when relevance is equal", () => {
    const priced = listing("priced", { price: 1_500_000, ranking_quality_score: 20 } as Partial<Listing>);
    const hidden = listing("hidden", { price: null, ranking_quality_score: 100 } as Partial<Listing>);
    const query = { city: "Rabat" };

    assert.ok(compareRecommendedListings(priced, hidden, query) < 0);
  });

  it("falls back to legacy quality when no passport score exists", () => {
    const legacy = listing("legacy");
    const rank = computeRankingBreakdown(legacy, { city: "Rabat" });
    assert.equal(rank.qualitySource, "legacy");
    assert.ok(rank.quality >= 0);
  });

  it("clamps malformed passport scores without suppressing the result", () => {
    const tooHigh = listing("too-high", { ranking_quality_score: 250 } as Partial<Listing>);
    const tooLow = listing("too-low", { ranking_quality_score: -50 } as Partial<Listing>);
    const highRank = computeRankingBreakdown(tooHigh, {});
    const lowRank = computeRankingBreakdown(tooLow, {});

    assert.equal(highRank.quality, 10);
    assert.equal(lowRank.quality, 0);
    assert.ok(highRank.total >= 0);
    assert.ok(lowRank.total >= 0);
  });
});
