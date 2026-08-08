// P0.1 — Mass Index Source Registry Operational Gate

import test from "node:test";
import assert from "node:assert/strict";
import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexDomains,
  evaluateMassIndexSourcePolicy,
  type MassIndexSourcePolicy,
} from "../../../lib/acquisition-scale-v1/mass-index-source-policy.js";

function policy(overrides: Partial<MassIndexSourcePolicy> = {}): MassIndexSourcePolicy {
  return {
    source_domain: "example.ma",
    allowed_discovery_channels: ["public_index", "commoncrawl"],
    review_status: "current",
    no_bypass_required: true,
    policy_hash: "sha256:fixture",
    acquisition_mode: "public_index_internal_only",
    machine_gate: "internal_signal_only",
    ingestion_gate: "internal_signal_only",
    display_gate: "hidden",
    ...overrides,
  };
}

test("allows Common Crawl only when the production policy explicitly allows that exact channel", () => {
  const decision = evaluateMassIndexSourcePolicy("example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy());
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "allowed");
});

test("fails closed for an unregistered source", () => {
  const decision = evaluateMassIndexSourcePolicy("unknown.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, null);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "source_unregistered");
});

test("public_sitemap permission never implies Common Crawl permission", () => {
  const decision = evaluateMassIndexSourcePolicy(
    "example.ma",
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policy({ allowed_discovery_channels: ["public_sitemap"], acquisition_mode: "public_sitemap_canonical_link" }),
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "channel_not_allowed");
});

test("fails closed when no-bypass is not explicitly required", () => {
  const decision = evaluateMassIndexSourcePolicy("example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy({ no_bypass_required: false }));
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "invalid_no_bypass");
});

test("fails closed when the policy hash is missing", () => {
  const decision = evaluateMassIndexSourcePolicy("example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy({ policy_hash: null }));
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "missing_policy_hash");
});

test("overdue or due policy review cannot drive mass-index acquisition", () => {
  for (const reviewStatus of ["overdue", "due"]) {
    const decision = evaluateMassIndexSourcePolicy("example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy({ review_status: reviewStatus }));
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "policy_review_not_current");
  }
});

test("blocked acquisition/machine/ingestion gates each fail closed", () => {
  assert.equal(
    evaluateMassIndexSourcePolicy("example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy({ acquisition_mode: "blocked" })).reason,
    "acquisition_blocked",
  );
  assert.equal(
    evaluateMassIndexSourcePolicy("example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy({ machine_gate: "blocked_review_overdue" })).reason,
    "machine_gate_blocked",
  );
  assert.equal(
    evaluateMassIndexSourcePolicy("example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy({ ingestion_gate: "blocked" })).reason,
    "ingestion_gate_blocked",
  );
});

test("domain matching is exact after normalization; parent policy never authorizes a subdomain", () => {
  const decision = evaluateMassIndexSourcePolicy("sub.example.ma", MASS_INDEX_COMMONCRAWL_CHANNEL, policy({ source_domain: "example.ma" }));
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "source_unregistered");
});

test("batch evaluation returns only policy-authorized source/channel pairs", () => {
  const result = evaluateMassIndexDomains(
    ["allowed.ma", "sitemap-only.ma", "missing.ma", "allowed.ma"],
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    [
      policy({ source_domain: "allowed.ma" }),
      policy({ source_domain: "sitemap-only.ma", allowed_discovery_channels: ["public_sitemap"], acquisition_mode: "public_sitemap_canonical_link" }),
    ],
  );

  assert.deepEqual(result.allowedDomains, ["allowed.ma"]);
  assert.deepEqual(
    Object.fromEntries(result.decisions.map((decision) => [decision.source_domain, decision.reason])),
    {
      "allowed.ma": "allowed",
      "missing.ma": "source_unregistered",
      "sitemap-only.ma": "channel_not_allowed",
    },
  );
});
