import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRegistryActivationReadiness,
  type RegistryActivationPolicy,
} from "@/lib/acquisition-scale-v1/registry-activation-readiness";

const NOW = new Date("2026-08-09T11:30:00Z");

function policy(overrides: Partial<RegistryActivationPolicy> = {}): RegistryActivationPolicy {
  return {
    source_domain: "christiesrealestatemorocco.com",
    allowed_discovery_channels: ["public_index", "commoncrawl"],
    review_status: "current",
    next_review_at: "2026-08-21T13:25:45.185Z",
    no_bypass_required: true,
    policy_hash: "hash",
    acquisition_mode: "public_index_internal_only",
    machine_gate: "internal_signal_only",
    ingestion_gate: "internal_signal_only",
    display_gate: "hidden",
    authorization_status: "limited_public_facts",
    partnership_required: false,
    legal_review_required: false,
    discovery_policy: "public_index_only",
    detail_fetch_policy: "paused",
    content_reuse_policy: "unknown",
    display_policy: "internal_signal_only",
    ...overrides,
  };
}

test("shadow evidence alone never overrides unverified authorization", () => {
  const result = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    policy({ authorization_status: "unverified" }),
    true,
    NOW,
  );
  assert.equal(result.ready, false);
  assert.equal(result.decision, "BLOCKED_BY_POLICY");
  assert.ok(result.reasons.includes("authorization_not_positive"));
});

test("partnership and legal review flags independently block canary review", () => {
  const partnership = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    policy({ partnership_required: true }),
    true,
    NOW,
  );
  assert.ok(partnership.reasons.includes("partnership_required"));

  const legal = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    policy({ legal_review_required: true }),
    true,
    NOW,
  );
  assert.ok(legal.reasons.includes("legal_review_required"));
});

test("expired or channel-blocked Common Crawl policy blocks readiness", () => {
  const expired = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    policy({ next_review_at: "2026-08-08T00:00:00Z" }),
    true,
    NOW,
  );
  assert.ok(expired.reasons.includes("commoncrawl_policy_blocked"));

  const channelBlocked = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    policy({ allowed_discovery_channels: ["public_index"] }),
    true,
    NOW,
  );
  assert.ok(channelBlocked.reasons.includes("commoncrawl_policy_blocked"));
});

test("non-shadow candidate cannot become ready", () => {
  const result = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    policy(),
    false,
    NOW,
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.includes("shadow_not_acceptable"));
});

test("positive authorization plus current Common Crawl policy can reach review-only readiness", () => {
  const result = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    policy(),
    true,
    NOW,
  );
  assert.equal(result.ready, true);
  assert.equal(result.decision, "READY_FOR_CANARY_REVIEW");
  assert.deepEqual(result.reasons, []);
  assert.equal(result.canary_scope, "commoncrawl_seed_only_internal");
  assert.equal(result.display_policy, "internal_signal_only");
});

test("missing Registry row fails closed", () => {
  const result = evaluateRegistryActivationReadiness(
    "christiesrealestatemorocco.com",
    null,
    true,
    NOW,
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.includes("commoncrawl_policy_blocked"));
  assert.ok(result.reasons.includes("authorization_not_positive"));
});
