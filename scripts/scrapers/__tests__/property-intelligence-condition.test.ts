import test from "node:test";
import assert from "node:assert/strict";
import { extractConditionFeature } from "../../../lib/property-intelligence/condition-engine";

test("structured condition wins with observed status", () => {
  const feature = extractConditionFeature({ condition: "Entièrement rénové", description: "ancien appartement", sourceReliability: 1 });
  assert.equal(feature.key, "condition.segment");
  assert.equal(feature.value, "renovated_old");
  assert.equal(feature.status, "observed");
  assert.equal(feature.method, "structured_source");
});

test("structured property age maps conservatively", () => {
  assert.equal(extractConditionFeature({ propertyAgeRange: "5-10 ans", sourceReliability: 1 }).value, "recent");
  assert.equal(extractConditionFeature({ propertyAgeRange: "30+ ans", sourceReliability: 1 }).value, "old_unspecified");
});

test("conflicting explicit condition signals remain conflicted", () => {
  const feature = extractConditionFeature({ description: "Appartement entièrement rénové avec gros travaux à prévoir", sourceReliability: 1 });
  assert.equal(feature.value, null);
  assert.equal(feature.status, "conflicted");
});

test("absence of evidence remains unknown", () => {
  const feature = extractConditionFeature({ description: "Bel appartement central" });
  assert.equal(feature.value, "unknown");
  assert.equal(feature.status, "unknown");
});
