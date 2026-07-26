import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateFeatureDisplayEligibility,
  evaluateScoreDisplayEligibility,
} from "../../../lib/property-intelligence/display-eligibility";
import { calculateACI, calculateAQI } from "../../../lib/property-intelligence/score-engine";

const NOW = new Date("2026-07-26T12:00:00.000Z");

test("feature display gate accepts fresh supported public candidate", () => {
  const result = evaluateFeatureDisplayEligibility({
    featureKey: "equipment.pool",
    value: true,
    confidence: 0.9,
    status: "observed",
    method: "structured_source",
    generatedAt: "2026-07-20T12:00:00.000Z",
    evidenceDisplayable: true,
    batchValidated: true,
  }, NOW);
  assert.equal(result.eligible, true);
  assert.deepEqual(result.blockers, []);
});

test("feature display gate blocks conflicts, hidden evidence and unvalidated batches", () => {
  const result = evaluateFeatureDisplayEligibility({
    featureKey: "equipment.pool",
    value: null,
    confidence: 0.95,
    status: "conflicted",
    method: "rule_engine_v2",
    generatedAt: "2026-07-20T12:00:00.000Z",
    evidenceDisplayable: false,
    batchValidated: false,
  }, NOW);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.blockers, [
    "feature_status_not_publishable",
    "evidence_not_displayable",
    "batch_not_validated",
  ]);
});

test("feature display gate enforces registry freshness", () => {
  const result = evaluateFeatureDisplayEligibility({
    featureKey: "equipment.pool",
    value: true,
    confidence: 0.9,
    status: "inferred",
    method: "rule_engine_v2",
    generatedAt: "2025-01-01T00:00:00.000Z",
    evidenceDisplayable: true,
    batchValidated: true,
  }, NOW);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.blockers, ["feature_expired"]);
});

test("internal-only features cannot pass the public gate", () => {
  const result = evaluateFeatureDisplayEligibility({
    featureKey: "intelligence.aqi",
    value: 82,
    confidence: 0.95,
    status: "observed",
    method: "score_engine_v1",
    generatedAt: "2026-07-20T12:00:00.000Z",
    evidenceDisplayable: true,
    batchValidated: true,
  }, NOW);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.blockers, ["feature_not_public"]);
});

test("score display gate accepts only validated public candidates", () => {
  const aci = calculateACI([
    { key: "freshness", value: 95, weight: 0.5, confidence: 0.95, eligible: true },
    { key: "completeness", value: 90, weight: 0.5, confidence: 0.9, eligible: true },
  ]);
  assert.equal(evaluateScoreDisplayEligibility(aci, true, NOW).eligible, true);
  assert.deepEqual(evaluateScoreDisplayEligibility(aci, false, NOW).blockers, ["batch_not_validated"]);
});

test("AQI remains blocked from public display", () => {
  const aqi = calculateAQI([
    { key: "condition", value: 90, weight: 0.4, confidence: 0.95, eligible: true },
    { key: "equipment", value: 80, weight: 0.3, confidence: 0.9, eligible: true },
    { key: "distribution", value: 75, weight: 0.3, confidence: 0.9, eligible: true },
  ]);
  const result = evaluateScoreDisplayEligibility(aqi, true, NOW);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.blockers, ["score_not_public_candidate"]);
});
