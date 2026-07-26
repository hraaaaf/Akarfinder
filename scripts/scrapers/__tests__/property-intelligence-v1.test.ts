import test from "node:test";
import assert from "node:assert/strict";
import { calculateConfidence } from "../../../lib/property-intelligence/confidence";
import { extractPropertyFeatures } from "../../../lib/property-intelligence/rule-engine";
import { calculateACI, calculateAQI } from "../../../lib/property-intelligence/score-engine";
import { isValidFeatureValue } from "../../../lib/property-intelligence/feature-registry";

test("registry rejects unknown enum and array values", () => {
  assert.equal(isValidFeatureValue("condition.segment", "recent"), true);
  assert.equal(isValidFeatureValue("condition.segment", "magnifique"), false);
  assert.equal(isValidFeatureValue("environment.view", ["sea", "open"]), true);
  assert.equal(isValidFeatureValue("environment.view", ["ocean_like"]), false);
});

test("confidence penalizes explicit contradictions", () => {
  const clean = calculateConfidence({ supporting: ["explicit_text"], sourceReliability: 1 });
  const conflicted = calculateConfidence({ supporting: ["explicit_text"], contradicting: ["explicit_text"], sourceReliability: 1 });
  assert.equal(conflicted.conflicted, true);
  assert.ok(conflicted.confidence < clean.confidence);
});

test("negative phrase does not become a positive equipment feature", () => {
  const features = extractPropertyFeatures({ description: "Appartement sans ascenseur, sans parking et sans piscine", sourceReliability: 1 });
  assert.equal(features.find((item) => item.key === "equipment.elevator")?.value, false);
  assert.equal(features.find((item) => item.key === "equipment.parking")?.value, false);
  assert.equal(features.find((item) => item.key === "equipment.pool")?.value, false);
  assert.equal(features.find((item) => item.key === "equipment.pool")?.status, "inferred");
});

test("real contradictory statements are marked conflicted", () => {
  const features = extractPropertyFeatures({ description: "Résidence avec piscine. Mise à jour: pas de piscine.", sourceReliability: 1 });
  const pool = features.find((item) => item.key === "equipment.pool");
  assert.equal(pool?.value, null);
  assert.equal(pool?.status, "conflicted");
});

test("structured evidence takes precedence over text extraction", () => {
  const features = extractPropertyFeatures({ description: "Résidence avec piscine", structured: { has_pool: false }, sourceReliability: 1 });
  const pool = features.find((item) => item.key === "equipment.pool");
  assert.equal(pool?.value, false);
  assert.equal(pool?.method, "structured_source");
});

test("rule engine extracts extended equipment and environment signals", () => {
  const features = extractPropertyFeatures({
    description: "Appartement lumineux et calme, avec terrasse, balcon, salle de sport, sécurité 24/24 et vue mer dégagée.",
    sourceReliability: 1,
  });
  assert.equal(features.find((item) => item.key === "equipment.terrace")?.value, true);
  assert.equal(features.find((item) => item.key === "equipment.balcony")?.value, true);
  assert.equal(features.find((item) => item.key === "equipment.gym")?.value, true);
  assert.equal(features.find((item) => item.key === "environment.calm")?.value, true);
  assert.equal(features.find((item) => item.key === "environment.bright")?.value, true);
  assert.deepEqual(features.find((item) => item.key === "environment.view")?.value, ["sea", "open"]);
});

test("rule engine recognizes Arabic equipment signals with unicode boundaries", () => {
  const features = extractPropertyFeatures({ description: "شقة مفروشة مع مصعد وحراسة ومسبح", sourceReliability: 1 });
  assert.equal(features.find((item) => item.key === "equipment.furnished")?.value, true);
  assert.equal(features.find((item) => item.key === "equipment.elevator")?.value, true);
  assert.equal(features.find((item) => item.key === "equipment.security")?.value, true);
  assert.equal(features.find((item) => item.key === "equipment.pool")?.value, true);
});

test("standing engine classifies explicit multilingual standing", () => {
  const french = extractPropertyFeatures({ description: "Appartement haut standing", sourceReliability: 1 });
  const arabic = extractPropertyFeatures({ description: "شقة فاخرة", sourceReliability: 1 });
  assert.equal(french.find((item) => item.key === "standing.level")?.value, "high");
  assert.equal(arabic.find((item) => item.key === "standing.level")?.value, "luxury");
});

test("standing contradictions remain conflicted", () => {
  const features = extractPropertyFeatures({ description: "Logement économique présenté comme haut standing", sourceReliability: 1 });
  const standing = features.find((item) => item.key === "standing.level");
  assert.equal(standing?.value, null);
  assert.equal(standing?.status, "conflicted");
});

test("orientation conflicts are not published as a value", () => {
  const features = extractPropertyFeatures({ description: "Double orientation sud et nord", sourceReliability: 1 });
  const orientation = features.find((item) => item.key === "environment.orientation");
  assert.equal(orientation?.value, null);
  assert.equal(orientation?.status, "conflicted");
});

test("unknown remains unknown when no evidence exists", () => {
  const features = extractPropertyFeatures({ description: "Bel appartement central" });
  assert.equal(features.find((item) => item.key === "equipment.pool")?.status, "unknown");
  assert.equal(features.find((item) => item.key === "standing.level")?.status, "unknown");
});

test("ACI blocks insufficient coverage", () => {
  const result = calculateACI([{ key: "freshness", value: 90, weight: 1, confidence: 0.8, eligible: false }]);
  assert.equal(result.status, "blocked");
  assert.equal(result.score, null);
  assert.deepEqual(result.blockers, ["insufficient_factor_coverage", "no_eligible_factor"]);
});

test("score engine rejects malformed and duplicate factors", () => {
  const malformed = calculateACI([{ key: "freshness", value: Number.NaN, weight: 1, confidence: 0.9, eligible: true }]);
  assert.equal(malformed.status, "blocked");
  assert.deepEqual(malformed.blockers, ["invalid_factor"]);

  const duplicate = calculateACI([
    { key: "freshness", value: 90, weight: 0.5, confidence: 0.9, eligible: true },
    { key: "freshness", value: 80, weight: 0.5, confidence: 0.9, eligible: true },
  ]);
  assert.equal(duplicate.status, "blocked");
  assert.deepEqual(duplicate.blockers, ["duplicate_factor_key"]);
});

test("ACI returns traceable normalized contributions", () => {
  const result = calculateACI([
    { key: "freshness", value: 100, weight: 0.6, confidence: 0.95, eligible: true },
    { key: "completeness", value: 50, weight: 0.4, confidence: 0.9, eligible: true },
  ]);
  assert.equal(result.status, "public_candidate");
  assert.equal(result.score, 80);
  assert.equal(result.coverage, 1);
  assert.equal(result.contributions.reduce((sum, item) => sum + item.normalizedWeight, 0), 1);
  assert.deepEqual(result.blockers, []);
});

test("ACI remains internal when aggregate confidence is below publication threshold", () => {
  const result = calculateACI([
    { key: "freshness", value: 90, weight: 0.6, confidence: 0.8, eligible: true },
    { key: "completeness", value: 80, weight: 0.4, confidence: 0.8, eligible: true },
  ]);
  assert.equal(result.status, "internal");
  assert.deepEqual(result.blockers, ["insufficient_score_confidence"]);
});

test("AQI remains internal even with strong factors", () => {
  const result = calculateAQI([
    { key: "condition", value: 90, weight: 0.4, confidence: 0.95, eligible: true },
    { key: "equipment", value: 80, weight: 0.3, confidence: 0.9, eligible: true },
    { key: "distribution", value: 75, weight: 0.3, confidence: 0.9, eligible: true },
  ]);
  assert.equal(result.status, "internal");
  assert.ok((result.score ?? 0) > 0);
  assert.deepEqual(result.blockers, []);
});
