import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCertifiedComparableSet, type MarketComparableCandidate, type MarketComparableTarget } from "@/lib/property-detail/market-comparables";

const NOW = new Date("2026-08-16T12:00:00Z");

function target(priceMad: number | null, surfaceM2: number | null): MarketComparableTarget {
  return {
    listingId: "target",
    city: "Rabat",
    neighborhood: "Agdal",
    propertyType: "Appartement",
    transactionType: "buy",
    priceMad,
    surfaceM2,
  };
}

function candidate(id: string, priceMad: number): MarketComparableCandidate {
  return {
    listingId: id,
    propertyClusterId: `cluster-${id}`,
    clusterVerified: true,
    city: "Rabat",
    neighborhood: "Agdal",
    propertyType: "Appartement",
    transactionType: "buy",
    displayedPriceMad: priceMad,
    surfaceM2: 100,
    observedAt: "2026-08-01T00:00:00Z",
    sourceCount: 1,
    sourceAttribution: ["Source A"],
  };
}

const candidates = [candidate("low", 1_500_000), candidate("mid", 2_000_000), candidate("high", 2_500_000)];

describe("ANN-L8 certified market position", () => {
  it("classifies target price per m2 against the certified P25-P75 distribution", () => {
    const within = buildCertifiedComparableSet({ target: target(2_000_000, 100), candidates, now: NOW });
    assert.equal(within.status, "certified");
    assert.equal(within.distribution?.p25PricePerM2, 17_500);
    assert.equal(within.distribution?.medianPricePerM2, 20_000);
    assert.equal(within.distribution?.p75PricePerM2, 22_500);
    assert.equal(within.distribution?.targetPricePerM2, 20_000);
    assert.equal(within.distribution?.targetPosition, "within_distribution");
    assert.equal(within.distribution?.targetGapToMedianPct, 0);

    const above = buildCertifiedComparableSet({ target: target(3_000_000, 100), candidates, now: NOW });
    assert.equal(above.distribution?.targetPosition, "above_distribution");
    assert.equal(above.distribution?.targetGapToMedianPct, 50);

    const below = buildCertifiedComparableSet({ target: target(1_000_000, 100), candidates, now: NOW });
    assert.equal(below.distribution?.targetPosition, "below_distribution");
    assert.equal(below.distribution?.targetGapToMedianPct, -50);
  });

  it("keeps comparables certified but refuses a market-position claim without a target price per m2", () => {
    const result = buildCertifiedComparableSet({ target: target(null, 100), candidates, now: NOW });
    assert.equal(result.status, "certified");
    assert.equal(result.distribution?.targetPricePerM2, null);
    assert.equal(result.distribution?.targetPosition, null);
    assert.equal(result.distribution?.targetGapToMedianPct, null);
  });
});
