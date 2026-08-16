import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMarketComparableTruthEvidence } from "@/lib/property-detail/market-comparables-truth";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";
import { createEmptyAnnouncementTruthEvidence, evaluateAnnouncementFeature } from "@/lib/property-detail/announcement-page-truth-contract-v1";

function model(overrides: Partial<MarketComparableSet> = {}): MarketComparableSet {
  return {
    status: "certified",
    reason: "certified",
    scope: "neighborhood",
    observedAt: "2026-08-10T00:00:00Z",
    sampleCount: 4,
    distribution: {
      sampleCount: 4,
      comparableStockCount: 4,
      minPricePerM2: 18000,
      p25PricePerM2: 19000,
      medianPricePerM2: 20000,
      p75PricePerM2: 21000,
      maxPricePerM2: 22000,
      targetPricePerM2: 20500,
      targetPosition: "within_distribution",
      targetGapToMedianPct: 2.5,
    },
    comparables: [{
      listingId: "2",
      propertyClusterId: "cluster-2",
      scope: "neighborhood",
      displayedPriceMad: 2_000_000,
      surfaceM2: 100,
      pricePerM2: 20_000,
      observedAt: "2026-08-10T00:00:00Z",
      sourceCount: 1,
      sourceAttribution: ["Source A"],
      surfaceDeltaRatio: 0,
    }],
    ...overrides,
  };
}

describe("ANN-L8 truth evidence", () => {
  it("opens comparables and market position only from a certified L8 model", () => {
    const derived = buildMarketComparableTruthEvidence(model());
    assert.deepEqual(derived, {
      comparables_certified: true,
      comparable_count: 4,
      market_position_certified: true,
    });

    const evidence = createEmptyAnnouncementTruthEvidence();
    evidence.page_access_allowed = true;
    Object.assign(evidence.intelligence, derived);
    assert.equal(evaluateAnnouncementFeature("comparables", evidence).allowed, true);
    assert.equal(evaluateAnnouncementFeature("market_position", evidence).allowed, true);
  });

  it("keeps market position closed when target price-per-m2 is unavailable", () => {
    const withoutPosition = model({
      distribution: {
        ...model().distribution!,
        targetPricePerM2: null,
        targetPosition: null,
        targetGapToMedianPct: null,
      },
    });
    const derived = buildMarketComparableTruthEvidence(withoutPosition);
    assert.equal(derived.comparables_certified, true);
    assert.equal(derived.market_position_certified, false);
  });

  it("fails closed for unavailable, undersized or structurally incomplete models", () => {
    const unavailable = buildMarketComparableTruthEvidence({
      status: "unavailable",
      reason: "insufficient_verified_sample",
      scope: null,
      observedAt: null,
      sampleCount: 2,
      distribution: null,
      comparables: [],
    });
    assert.deepEqual(unavailable, {
      comparables_certified: false,
      comparable_count: 0,
      market_position_certified: false,
    });

    const undersized = buildMarketComparableTruthEvidence(model({ sampleCount: 2 }));
    assert.equal(undersized.comparables_certified, false);
    const noDistribution = buildMarketComparableTruthEvidence(model({ distribution: null }));
    assert.equal(noDistribution.comparables_certified, false);
  });
});
