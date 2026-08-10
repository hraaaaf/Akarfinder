import assert from "node:assert/strict";
import test from "node:test";
import { evaluateActivationCandidate } from "../../audits/p1c3-neighborhood-offer-activation-review";

const base = {
  reliability_level: "moderate",
  p1c3_review_candidate: true,
  market_representativeness_certified: false,
  public_activation: false,
  metric_layers_activated: false,
};

test("P1C.3 ignores insufficient/limited rows even if a stale candidate flag is present", () => {
  assert.equal(
    evaluateActivationCandidate({ ...base, reliability_level: "limited" }),
    "NOT_REVIEW_CANDIDATE",
  );
});

test("P1C.3 holds a moderate candidate when acquisition representativeness is not certified", () => {
  assert.equal(
    evaluateActivationCandidate(base),
    "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED",
  );
});

test("P1C.3 holds a strong candidate when acquisition representativeness is not certified", () => {
  assert.equal(
    evaluateActivationCandidate({ ...base, reliability_level: "strong" }),
    "HOLD_MARKET_REPRESENTATIVENESS_REQUIRED",
  );
});

test("P1C.3 refuses review if a metric is already public or activated", () => {
  assert.equal(
    evaluateActivationCandidate({ ...base, public_activation: true }),
    "HOLD_ACTIVATION_DRIFT",
  );
  assert.equal(
    evaluateActivationCandidate({ ...base, metric_layers_activated: true }),
    "HOLD_ACTIVATION_DRIFT",
  );
});

test("P1C.3 can only mark a candidate eligible after exact-scope representativeness certification", () => {
  assert.equal(
    evaluateActivationCandidate({ ...base, market_representativeness_certified: true }),
    "CANARY_ELIGIBLE",
  );
});
