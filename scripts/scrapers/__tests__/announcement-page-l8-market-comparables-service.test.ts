import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Listing } from "@/lib/listings/types";
import {
  buildMarketComparablesForListing,
  buildMarketComparableTarget,
  type MarketComparableCandidateRepository,
} from "@/lib/property-detail/market-comparables-service";
import type { MarketComparableCandidate } from "@/lib/property-detail/market-comparables";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-42",
    title: "Appartement test",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_000_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 20_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    is_mre_friendly: false,
    description: "Test",
    image_url: "",
    reliability_explanation: "Test",
    ...overrides,
  };
}

function candidate(id: string): MarketComparableCandidate {
  return {
    listingId: id,
    propertyClusterId: `cluster-${id}`,
    clusterVerified: true,
    city: "Rabat",
    neighborhood: "Agdal",
    propertyType: "Appartement",
    transactionType: "buy",
    displayedPriceMad: 1_900_000,
    surfaceM2: 98,
    observedAt: "2026-08-01T09:00:00Z",
    sourceCount: 1,
    sourceAttribution: ["Source A"],
  };
}

describe("ANN-L8 market comparable orchestration", () => {
  it("builds a normalized target from the public listing without inventing missing values", () => {
    const value = buildMarketComparableTarget(listing());
    assert.ok(value);
    assert.equal(value?.listingId, "listing-42");
    assert.equal(value?.city, "Rabat");
    assert.equal(value?.neighborhood, "Agdal");
    assert.equal(value?.priceMad, 2_000_000);
    assert.equal(value?.surfaceM2, 100);

    const sparse = buildMarketComparableTarget(listing({ price: 0, surface_m2: 0 }));
    assert.equal(sparse?.priceMad, null);
    assert.equal(sparse?.surfaceM2, null);
  });

  it("certifies repository candidates through the pure comparable model", async () => {
    let calls = 0;
    const repository: MarketComparableCandidateRepository = {
      async findCandidates(target) {
        calls += 1;
        assert.equal(target.city, "Rabat");
        return [candidate("a"), candidate("b"), candidate("c")];
      },
    };
    const result = await buildMarketComparablesForListing(listing(), repository, { now: NOW });
    assert.equal(calls, 1);
    assert.equal(result.status, "certified");
    assert.equal(result.sampleCount, 3);
  });

  it("fails closed and reports repository errors without throwing into the listing page", async () => {
    let captured: unknown = null;
    const repository: MarketComparableCandidateRepository = {
      async findCandidates() {
        throw new Error("db unavailable");
      },
    };
    const result = await buildMarketComparablesForListing(listing(), repository, {
      now: NOW,
      onError: (error) => { captured = error; },
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "insufficient_verified_sample");
    assert.match(String(captured), /db unavailable/);
  });

  it("never queries the repository when the listing lacks a usable market target", async () => {
    let calls = 0;
    const repository: MarketComparableCandidateRepository = {
      async findCandidates() {
        calls += 1;
        return [candidate("a"), candidate("b"), candidate("c")];
      },
    };
    const result = await buildMarketComparablesForListing(listing({ city: "" }), repository, { now: NOW });
    assert.equal(calls, 0);
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "target_invalid");
  });
});
