import assert from "node:assert/strict";
import test from "node:test";
import {
  canPublishStatistic,
  normalizeSearchQueryState,
  trustDescriptorHasNoOpaqueScore,
  type PublishedStatistic,
  type TrustDescriptor,
} from "../../../lib/ux/contracts";

test("normalizes one canonical query state for list, split and map", () => {
  const state = normalizeSearchQueryState({
    q: "  appartement agdal  ",
    city: " Rabat ",
    minPrice: 2_000_000,
    maxPrice: 1_000_000,
    page: 0,
  });

  assert.equal(state.q, "appartement agdal");
  assert.equal(state.city, "Rabat");
  assert.equal(state.minPrice, 1_000_000);
  assert.equal(state.maxPrice, 2_000_000);
  assert.equal(state.page, 1);
  assert.equal(state.view, "list");
  assert.equal(state.sort, "relevance");
});

test("rejects publication when canonical sample is insufficient", () => {
  const stat: PublishedStatistic = {
    metric: "median_asking_price_per_m2",
    value: 16_000,
    unit: "MAD/m2",
    sampleSizeRaw: 20,
    sampleSizeCanonical: 7,
    periodStart: "2026-01-01",
    periodEnd: "2026-06-30",
    median: 16_000,
    confidence: "medium",
    methodologyVersion: "atlas-v1",
    askingPriceOnly: true,
  };

  assert.equal(canPublishStatistic(stat), false);
  assert.equal(canPublishStatistic({ ...stat, sampleSizeCanonical: 8 }), true);
});

test("trust remains multidimensional and never collapses into an opaque score", () => {
  const trust: TrustDescriptor = {
    origin: "public_index",
    freshness: "fresh",
    completeness: "medium",
    consistency: "high",
    canonicalConfidence: "medium",
    geoPrecision: "area",
  };

  assert.equal(trustDescriptorHasNoOpaqueScore(trust), true);
  assert.equal(trustDescriptorHasNoOpaqueScore({ ...trust, score: 92 } as TrustDescriptor), false);
});
