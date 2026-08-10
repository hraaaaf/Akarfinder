import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyReliabilityMetric,
  evaluateActivationCandidate,
  percentileCont,
} from "../../audits/p1c3-neighborhood-offer-activation-review";

const base = {
  reliability_level: "moderate",
  p1c3_review_candidate: true,
  market_representativeness_certified: false,
  public_activation: false,
  metric_layers_activated: false,
};

const thresholds = {
  limited: {
    min_sample_count: 5,
    min_field_coverage_percent: 50,
    min_fresh_sample_percent: 50,
    min_source_domain_count: 2,
    max_outlier_percent: 30,
    max_iqr_to_median_ratio: 1.5,
  },
  moderate: {
    min_sample_count: 10,
    min_field_coverage_percent: 60,
    min_fresh_sample_percent: 60,
    min_source_domain_count: 2,
    max_outlier_percent: 20,
    max_iqr_to_median_ratio: 1,
  },
  strong: {
    min_sample_count: 20,
    min_field_coverage_percent: 75,
    min_fresh_sample_percent: 70,
    min_source_domain_count: 3,
    max_outlier_percent: 15,
    max_iqr_to_median_ratio: 0.75,
  },
};

test("P1C.3 ignores insufficient/limited rows even if a stale candidate flag is present", () => {
  assert.equal(evaluateActivationCandidate({ ...base, reliability_level: "limited" }), "NOT_REVIEW_CANDIDATE");
});

test("P1C.3 holds moderate/strong candidates without acquisition representativeness", () => {
  assert.equal(evaluateActivationCandidate(base), "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED");
  assert.equal(
    evaluateActivationCandidate({ ...base, reliability_level: "strong" }),
    "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED",
  );
});

test("P1C.3 refuses review if a metric is already public or activated", () => {
  assert.equal(evaluateActivationCandidate({ ...base, public_activation: true }), "HOLD_ACTIVATION_DRIFT");
  assert.equal(evaluateActivationCandidate({ ...base, metric_layers_activated: true }), "HOLD_ACTIVATION_DRIFT");
});

test("P1C.3 can only mark a candidate eligible after exact-scope representativeness certification", () => {
  assert.equal(
    evaluateActivationCandidate({ ...base, market_representativeness_certified: true }),
    "CANARY_ELIGIBLE",
  );
});

test("P1C.3 percentile replay matches continuous interpolation semantics", () => {
  assert.equal(percentileCont([], 0.5), null);
  assert.equal(percentileCont([84], 0.5), 84);
  assert.equal(percentileCont([10, 20], 0.5), 15);
  assert.equal(percentileCont([10, 20, 30, 40], 0.25), 17.5);
  assert.equal(percentileCont([10, 20, 30, 40], 0.75), 32.5);
});

test("P1C.3 reliability replay preserves P1C.2 5/10/20 fail-closed gates", () => {
  assert.equal(
    classifyReliabilityMetric(
      { sample_count: 4, field_coverage_percent: 100, fresh_sample_percent: 100, source_domain_count: 4, outlier_percent: 0, iqr_to_median_ratio: 0.1 },
      thresholds,
    ),
    "insufficient",
  );
  assert.equal(
    classifyReliabilityMetric(
      { sample_count: 5, field_coverage_percent: 100, fresh_sample_percent: 100, source_domain_count: 2, outlier_percent: 0, iqr_to_median_ratio: 0.1 },
      thresholds,
    ),
    "limited",
  );
  assert.equal(
    classifyReliabilityMetric(
      { sample_count: 10, field_coverage_percent: 100, fresh_sample_percent: 90, source_domain_count: 3, outlier_percent: 0, iqr_to_median_ratio: 0.4 },
      thresholds,
    ),
    "moderate",
  );
  assert.equal(
    classifyReliabilityMetric(
      { sample_count: 20, field_coverage_percent: 80, fresh_sample_percent: 80, source_domain_count: 3, outlier_percent: 0, iqr_to_median_ratio: 0.4 },
      thresholds,
    ),
    "strong",
  );
});

test("P1C.3 reliability replay treats missing dispersion as insufficient", () => {
  assert.equal(
    classifyReliabilityMetric(
      { sample_count: 20, field_coverage_percent: 100, fresh_sample_percent: 100, source_domain_count: 4, outlier_percent: 0, iqr_to_median_ratio: null },
      thresholds,
    ),
    "insufficient",
  );
});
