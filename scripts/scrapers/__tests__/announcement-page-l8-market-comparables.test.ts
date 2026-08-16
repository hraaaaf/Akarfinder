import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCertifiedComparableSet,
  MARKET_COMPARABLE_MAX_PUBLIC,
  type MarketComparableCandidate,
  type MarketComparableTarget,
} from "@/lib/property-detail/market-comparables";
import {
  createEmptyAnnouncementTruthEvidence,
  evaluateAnnouncementFeature,
} from "@/lib/property-detail/announcement-page-truth-contract-v1";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function target(overrides: Partial<MarketComparableTarget> = {}): MarketComparableTarget {
  return {
    listingId: "target",
    city: "Rabat",
    neighborhood: "Agdal",
    propertyType: "Appartement",
    transactionType: "buy",
    priceMad: 2_000_000,
    surfaceM2: 100,
    ...overrides,
  };
}

function candidate(id: string, overrides: Partial<MarketComparableCandidate> = {}): MarketComparableCandidate {
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
    observedAt: "2026-08-01T09:00:00.000Z",
    sourceCount: 1,
    sourceAttribution: ["Source A"],
    ...overrides,
  };
}

describe("ANN-L8 certified comparable set", () => {
  it("certifies a neighborhood sample only from verified, fresh and attributable candidates", () => {
    const result = buildCertifiedComparableSet({
      target: target(),
      candidates: [candidate("a"), candidate("b", { surfaceM2: 102 }), candidate("c", { displayedPriceMad: 2_100_000 })],
      now: NOW,
    });

    assert.equal(result.status, "certified");
    assert.equal(result.scope, "neighborhood");
    assert.equal(result.sampleCount, 3);
    assert.equal(result.comparables.length, 3);
    assert.ok(result.comparables.every((item) => item.pricePerM2 > 0));
    assert.ok(result.observedAt);
  });

  it("falls back to city scope only when neighborhood sample is insufficient", () => {
    const result = buildCertifiedComparableSet({
      target: target(),
      candidates: [
        candidate("agdal"),
        candidate("hay-riad", { neighborhood: "Hay Riad" }),
        candidate("hassan", { neighborhood: "Hassan" }),
      ],
      now: NOW,
    });

    assert.equal(result.status, "certified");
    assert.equal(result.scope, "city");
    assert.equal(result.sampleCount, 3);
  });

  it("fails closed below the minimum verified sample", () => {
    const result = buildCertifiedComparableSet({
      target: target(),
      candidates: [candidate("a"), candidate("b")],
      now: NOW,
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "insufficient_verified_sample");
    assert.equal(result.comparables.length, 0);
  });

  it("rejects stale, future, unverified, unattributed, malformed and wrong-market candidates", () => {
    const valid = candidate("valid");
    const result = buildCertifiedComparableSet({
      target: target({ neighborhood: null }),
      candidates: [
        valid,
        candidate("stale", { observedAt: "2026-01-01T00:00:00Z" }),
        candidate("future", { observedAt: "2026-08-17T00:00:00Z" }),
        candidate("unverified", { clusterVerified: false }),
        candidate("no-source", { sourceAttribution: [] }),
        candidate("bad-price", { displayedPriceMad: 0 }),
        candidate("bad-surface", { surfaceM2: null }),
        candidate("wrong-city", { city: "Casablanca" }),
        candidate("wrong-type", { propertyType: "Villa" }),
        candidate("wrong-transaction", { transactionType: "rent" }),
        candidate("too-different", { surfaceM2: 150 }),
        candidate("v2"),
        candidate("v3"),
      ],
      now: NOW,
    });

    assert.equal(result.status, "certified");
    assert.equal(result.sampleCount, 3);
    assert.deepEqual(result.comparables.map((item) => item.listingId).sort(), ["v2", "v3", "valid"]);
  });

  it("deduplicates the same property cluster and keeps its newest eligible observation", () => {
    const result = buildCertifiedComparableSet({
      target: target({ neighborhood: null }),
      candidates: [
        candidate("old", { propertyClusterId: "same", observedAt: "2026-07-20T00:00:00Z" }),
        candidate("new", { propertyClusterId: "same", observedAt: "2026-08-10T00:00:00Z" }),
        candidate("b"),
        candidate("c"),
      ],
      now: NOW,
    });

    assert.equal(result.status, "certified");
    assert.equal(result.sampleCount, 3);
    assert.ok(result.comparables.some((item) => item.listingId === "new"));
    assert.ok(!result.comparables.some((item) => item.listingId === "old"));
  });

  it("caps the public set without shrinking the certified sample count", () => {
    const values = Array.from({ length: 9 }, (_, index) => candidate(`c${index}`, {
      propertyClusterId: `cluster-${index}`,
      surfaceM2: 96 + index,
    }));
    const result = buildCertifiedComparableSet({ target: target(), candidates: values, now: NOW });
    assert.equal(result.status, "certified");
    assert.equal(result.sampleCount, 9);
    assert.equal(result.comparables.length, MARKET_COMPARABLE_MAX_PUBLIC);
  });

  it("only opens the public comparables truth gate after this model is certified", () => {
    const certified = buildCertifiedComparableSet({
      target: target(),
      candidates: [candidate("a"), candidate("b"), candidate("c")],
      now: NOW,
    });
    const unavailable = buildCertifiedComparableSet({ target: target(), candidates: [candidate("a")], now: NOW });

    const evidence = createEmptyAnnouncementTruthEvidence();
    evidence.page_access_allowed = true;
    evidence.intelligence.comparables_certified = certified.status === "certified";
    evidence.intelligence.comparable_count = certified.status === "certified" ? certified.sampleCount : 0;
    assert.equal(evaluateAnnouncementFeature("comparables", evidence).allowed, true);

    evidence.intelligence.comparables_certified = unavailable.status === "certified";
    evidence.intelligence.comparable_count = unavailable.status === "certified" ? unavailable.sampleCount : 0;
    assert.equal(evaluateAnnouncementFeature("comparables", evidence).allowed, false);
  });
});
