import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildObservedPriceHistory,
  certifyAkarEstimate,
} from "../../../lib/property-detail/akar-estimate-history";

describe("ANN-L9 observed price history", () => {
  it("keeps only real attributable positive price observations and sorts them chronologically", () => {
    const model = buildObservedPriceHistory([
      { observedAt: "2026-08-10T10:00:00Z", displayedPriceMad: 1_200_000, sourceOfferId: 2, sourceName: "Source B" },
      { observedAt: "2026-07-10T10:00:00Z", displayedPriceMad: 1_250_000, sourceOfferId: 2, sourceName: "Source B" },
      { observedAt: "invalid", displayedPriceMad: 1_300_000, sourceOfferId: 2, sourceName: "Source B" },
      { observedAt: "2026-06-10T10:00:00Z", displayedPriceMad: 0, sourceOfferId: 2, sourceName: "Source B" },
      { observedAt: "2026-05-10T10:00:00Z", displayedPriceMad: 1_400_000, sourceOfferId: 3, sourceName: "" },
    ]);

    assert.equal(model.status, "available");
    assert.equal(model.observationCount, 2);
    assert.deepEqual(model.points.map((point) => point.displayedPriceMad), [1_250_000, 1_200_000]);
    assert.equal(model.firstObservedAt, "2026-07-10T10:00:00Z");
    assert.equal(model.lastObservedAt, "2026-08-10T10:00:00Z");
  });

  it("deduplicates identical source/time/price observations", () => {
    const observation = { observedAt: "2026-08-10T10:00:00Z", displayedPriceMad: 1_200_000, sourceOfferId: 2, sourceName: "Source B" };
    const model = buildObservedPriceHistory([observation, observation]);
    assert.equal(model.observationCount, 1);
  });

  it("fails closed when there is no valid price observation", () => {
    const model = buildObservedPriceHistory([]);
    assert.deepEqual(model, {
      status: "unavailable",
      points: [],
      observationCount: 0,
      firstObservedAt: null,
      lastObservedAt: null,
    });
  });
});

describe("ANN-L9 AkarEstimate certification", () => {
  const validCandidate = {
    valueMad: 1_200_000,
    lowMad: 1_100_000,
    highMad: 1_300_000,
    confidence: 0.8,
    modelVersion: "akar-estimate-v1",
    modelDate: "2026-08-16T00:00:00Z",
    segment: "rabat|apartment|sale",
    trainingSampleSize: 500,
    validation: {
      holdoutSampleSize: 100,
      mapePct: 8,
      medianAbsoluteErrorPct: 6,
    },
    publicationPolicy: {
      policyVersion: "policy-v1",
      minimumHoldoutSampleSize: 80,
      maximumMapePct: 10,
      maximumMedianAbsoluteErrorPct: 8,
    },
  };

  it("certifies only when the explicit versioned publication policy is met", () => {
    const certified = certifyAkarEstimate(validCandidate);
    assert.equal(certified?.status, "certified");
  });

  it("fails closed when holdout error exceeds policy", () => {
    const certified = certifyAkarEstimate({
      ...validCandidate,
      validation: { ...validCandidate.validation, mapePct: 12 },
    });
    assert.equal(certified, null);
  });

  it("fails closed for undersized holdout, invalid range or missing model metadata", () => {
    assert.equal(certifyAkarEstimate({
      ...validCandidate,
      validation: { ...validCandidate.validation, holdoutSampleSize: 20 },
    }), null);
    assert.equal(certifyAkarEstimate({ ...validCandidate, lowMad: 1_300_000, highMad: 1_100_000 }), null);
    assert.equal(certifyAkarEstimate({ ...validCandidate, modelVersion: "" }), null);
  });

  it("never hides thresholds inside the model contract", () => {
    const stricterPolicy = {
      ...validCandidate.publicationPolicy,
      policyVersion: "policy-v2",
      maximumMapePct: 5,
    };
    assert.equal(certifyAkarEstimate({ ...validCandidate, publicationPolicy: stricterPolicy }), null);
  });
});
