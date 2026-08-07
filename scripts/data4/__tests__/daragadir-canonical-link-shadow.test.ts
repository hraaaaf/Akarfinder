import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDarAgadirCandidate,
  classifyDarAgadirRows,
  policyAllowsCanonicalShadow,
  type DarAgadirCandidate,
  type DarAgadirPolicy,
} from "../daragadir-canonical-link-shadow";

function policy(overrides: Partial<DarAgadirPolicy> = {}): DarAgadirPolicy {
  return {
    sourceDomain: "daragadir.com",
    acquisitionMode: "public_sitemap_canonical_link",
    discoveryPolicy: "public_sitemap_only",
    detailFetchPolicy: "legal_review_required",
    contentReusePolicy: "unknown",
    displayPolicy: "canonical_link_only",
    displayGate: "external_tail_link_only",
    machineGate: "canonical_link_only",
    allowedDiscoveryChannels: ["public_sitemap"],
    maxRevalidationIntervalDays: 14,
    reviewStatus: "due_soon",
    ...overrides,
  };
}

function row(overrides: Partial<DarAgadirCandidate> = {}): DarAgadirCandidate {
  return {
    canonicalUrl: "https://daragadir.com/property/example",
    normalizationStatus: "normalized",
    freshnessStatus: "fresh_confirmed",
    city: "Agadir",
    propertyType: "apartment",
    intent: "sale",
    qualityScore: 55,
    displayEligibility: "eligible_secondary",
    ...overrides,
  };
}

test("exact Registry boundary permits shadow analysis but not production activation", () => {
  assert.equal(policyAllowsCanonicalShadow(policy()), true);
  const result = classifyDarAgadirCandidate(row(), policy());
  assert.equal(result.classification, "ELIGIBLE_SHADOW");
  assert.equal(result.productionActivable, false);
});

test("seed-only rows require revalidation and cannot be shadow-eligible", () => {
  const result = classifyDarAgadirCandidate(row({ freshnessStatus: "seed_only" }), policy());
  assert.equal(result.classification, "SEED_ONLY_REVALIDATION_REQUIRED");
});

test("fresh row missing canonical structure stays insufficient", () => {
  const result = classifyDarAgadirCandidate(row({ propertyType: null }), policy());
  assert.equal(result.classification, "INSUFFICIENT_STRUCTURE");
});

test("policy drift fail-closes the whole row", () => {
  const result = classifyDarAgadirCandidate(row(), policy({ displayGate: "hidden" }));
  assert.equal(result.classification, "POLICY_BLOCKED");
});

test("duplicate canonical URLs are never counted twice", () => {
  const results = classifyDarAgadirRows([row(), row()], policy());
  assert.equal(results[0]?.classification, "ELIGIBLE_SHADOW");
  assert.equal(results[1]?.classification, "DUPLICATE");
});

test("quality evidence is required even for fresh core-structured rows", () => {
  const result = classifyDarAgadirCandidate(row({ qualityScore: 20 }), policy());
  assert.equal(result.classification, "INSUFFICIENT_QUALITY_EVIDENCE");
});
