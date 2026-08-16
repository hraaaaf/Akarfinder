import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMetricReliability } from "@/lib/map/market-metric-reliability";

function observation(value: number, index: number) {
  return {
    value,
    fresh: true,
    sourceDomain: index % 2 === 0 ? "a.example" : "b.example",
  };
}

test("less than five samples stays insufficient", () => {
  const result = evaluateMetricReliability({
    listingCount: 4,
    observations: [10, 11, 12, 13].map(observation),
  });
  assert.equal(result.level, "insufficient");
  assert.equal(result.sampleCount, 4);
});

test("limited requires the full versioned policy, not sample count alone", () => {
  const passing = evaluateMetricReliability({
    listingCount: 5,
    observations: [10, 11, 12, 13, 14].map(observation),
  });
  assert.equal(passing.level, "limited");

  const oneSource = evaluateMetricReliability({
    listingCount: 5,
    observations: [10, 11, 12, 13, 14].map((value) => ({ value, fresh: true, sourceDomain: "one.example" })),
  });
  assert.equal(oneSource.level, "insufficient");
});

test("strong follows sample, coverage, freshness, sources, outliers and dispersion", () => {
  const observations = Array.from({ length: 20 }, (_, index) => ({
    value: 10_000 + index * 50,
    fresh: index < 18,
    sourceDomain: ["a.example", "b.example", "c.example"][index % 3],
  }));
  const result = evaluateMetricReliability({ listingCount: 20, observations });
  assert.equal(result.level, "strong");
  assert.equal(result.sourceDomainCount, 3);
  assert.equal(result.freshSamplePercent, 90);
});

test("missing observations remain explicit and safe", () => {
  const result = evaluateMetricReliability({ listingCount: 8, observations: [] });
  assert.deepEqual(result, {
    level: "insufficient",
    sampleCount: 0,
    fieldCoveragePercent: 0,
    freshSamplePercent: 0,
    sourceDomainCount: 0,
    outlierPercent: 0,
    iqrToMedianRatio: null,
    median: null,
  });
});
