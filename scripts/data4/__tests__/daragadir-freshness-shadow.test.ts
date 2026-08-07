import assert from "node:assert/strict";
import test from "node:test";
import { classifyFreshnessShadowCandidate, policyAllowsFreshnessShadow, type FreshnessShadowCandidate, type FreshnessShadowPolicy } from "../daragadir-freshness-shadow";

const policy: FreshnessShadowPolicy = {
  sourceDomain: "daragadir.com",
  acquisitionMode: "public_sitemap_canonical_link",
  discoveryPolicy: "public_sitemap_only",
  displayPolicy: "canonical_link_only",
  displayGate: "external_tail_link_only",
  machineGate: "canonical_link_only",
  allowedDiscoveryChannels: ["public_sitemap"],
  maxRevalidationIntervalDays: 14,
  reviewStatus: "due_soon",
};

const row: FreshnessShadowCandidate = {
  canonicalUrl: "https://daragadir.com/annonce/test",
  normalizationStatus: "normalized",
  freshnessStatus: "seed_only",
  city: "Agadir",
  propertyType: "apartment",
  intent: "sale",
  qualityScore: 60,
  displayEligibility: "eligible_secondary",
};

test("registry boundary allows read-only sitemap freshness shadow", () => {
  assert.equal(policyAllowsFreshnessShadow(policy), true);
});

test("seed-only sitemap-present structured row can become SHADOW_READY only hypothetically", () => {
  const result = classifyFreshnessShadowCandidate(row, policy, true);
  assert.equal(result.classification, "SHADOW_READY");
  assert.equal(result.hypotheticalFreshnessSignal, "sitemap_present_shadow");
  assert.equal(result.productionActivable, false);
});

test("sitemap absence never upgrades freshness", () => {
  const result = classifyFreshnessShadowCandidate(row, policy, false);
  assert.equal(result.classification, "NOT_PRESENT_IN_CURRENT_SITEMAP");
  assert.equal(result.hypotheticalFreshnessSignal, null);
});

test("quality and display evidence remain mandatory", () => {
  const result = classifyFreshnessShadowCandidate({ ...row, qualityScore: 20 }, policy, true);
  assert.equal(result.classification, "SITEMAP_PRESENT_BUT_INSUFFICIENT_QUALITY");
});

test("policy drift blocks the entire shadow", () => {
  const result = classifyFreshnessShadowCandidate(row, { ...policy, displayGate: "hidden" }, true);
  assert.equal(result.classification, "POLICY_BLOCKED");
});
