import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AkarEstimateHistoryRuntime } from "../../../lib/property-detail/akar-estimate-history-runtime";
import {
  canPublishAkarEstimate,
  canPublishObservedPriceHistory,
} from "../../../lib/property-detail/akar-estimate-history-truth";

function historyModel(): AkarEstimateHistoryRuntime {
  return {
    history: {
      status: "available",
      points: [
        { observedAt: "2026-08-01T00:00:00Z", displayedPriceMad: 1_200_000, sourceOfferId: 10, sourceName: "Source A" },
      ],
      observationCount: 1,
      firstObservedAt: "2026-08-01T00:00:00Z",
      lastObservedAt: "2026-08-01T00:00:00Z",
    },
    estimate: null,
  };
}

describe("ANN-L9 truth bridge", () => {
  it("opens price history only from real price observations", () => {
    assert.equal(canPublishObservedPriceHistory(historyModel()), true);
    assert.equal(canPublishObservedPriceHistory({
      history: { status: "unavailable", points: [], observationCount: 0, firstObservedAt: null, lastObservedAt: null },
      estimate: null,
    }), false);
  });

  it("keeps AkarEstimate closed when runtime has no certified model", () => {
    assert.equal(canPublishAkarEstimate(historyModel()), false);
  });

  it("opens AkarEstimate only for a certified estimate with an internally valid range", () => {
    const model = historyModel();
    model.estimate = {
      status: "certified",
      valueMad: 1_200_000,
      lowMad: 1_100_000,
      highMad: 1_300_000,
      confidence: 0.8,
      modelVersion: "model-v1",
      modelDate: "2026-08-16T00:00:00Z",
      segment: "rabat|apartment|sale",
      trainingSampleSize: 500,
      validation: { holdoutSampleSize: 100, mapePct: 8, medianAbsoluteErrorPct: 6 },
      publicationPolicy: {
        policyVersion: "policy-v1",
        minimumHoldoutSampleSize: 80,
        maximumMapePct: 10,
        maximumMedianAbsoluteErrorPct: 8,
      },
    };
    assert.equal(canPublishAkarEstimate(model), true);
  });
});
