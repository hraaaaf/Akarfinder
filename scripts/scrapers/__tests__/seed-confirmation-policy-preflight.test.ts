import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildSeedConfirmationPolicyMap,
  evaluateSeedConfirmationPolicy,
  normalizePolicyDomain,
  type SeedConfirmationPolicy,
} from "../../../lib/acquisition-scale-v1/seed-confirmation-policy.js";

const NOW = new Date("2026-08-27T12:00:00.000Z");

function policy(overrides: Partial<SeedConfirmationPolicy> = {}): SeedConfirmationPolicy {
  return {
    source_domain: "agenz.ma",
    authorization_status: "unverified",
    acquisition_mode: "public_index_internal_only",
    allowed_discovery_channels: ["public_index", "commoncrawl"],
    review_status: "current",
    policy_effective_at: "2026-08-23T21:36:00.000Z",
    policy_expires_at: "2026-09-06T21:36:00.000Z",
    machine_gate: "canonical_link_only",
    ingestion_gate: "canonical_link_only",
    display_gate: "external_tail_link_only",
    ...overrides,
  };
}

test("valid current canonical-link public-index policy is eligible", () => {
  assert.deepEqual(evaluateSeedConfirmationPolicy(policy(), NOW), {
    eligible: true,
    reason: "policy_current_public_index_link_only",
  });
});

test("missing policy fails closed", () => {
  assert.equal(evaluateSeedConfirmationPolicy(undefined, NOW).eligible, false);
});

test("prohibited and permission-required policies fail closed", () => {
  assert.equal(evaluateSeedConfirmationPolicy(policy({ authorization_status: "prohibited" }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ authorization_status: "permission_required" }), NOW).eligible, false);
});

test("expired, future and null validity windows fail closed", () => {
  assert.equal(evaluateSeedConfirmationPolicy(policy({ policy_expires_at: "2026-08-27T11:59:59.000Z" }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ policy_effective_at: "2026-08-27T12:00:01.000Z" }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ policy_expires_at: null }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ policy_effective_at: null }), NOW).eligible, false);
});

test("wrong review/channel/acquisition/gates fail closed", () => {
  assert.equal(evaluateSeedConfirmationPolicy(policy({ review_status: "overdue" }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ allowed_discovery_channels: ["commoncrawl"] }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ acquisition_mode: "public_sitemap_canonical_link" }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ machine_gate: "internal_signal_only" }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ ingestion_gate: "internal_signal_only" }), NOW).eligible, false);
  assert.equal(evaluateSeedConfirmationPolicy(policy({ display_gate: "hidden" }), NOW).eligible, false);
});

test("domain normalization makes policy lookup exact but www-insensitive", () => {
  const map = buildSeedConfirmationPolicyMap([policy({ source_domain: "WWW.AGENZ.MA" })]);
  assert.equal(normalizePolicyDomain("www.agenz.ma"), "agenz.ma");
  assert.equal(map.get("agenz.ma")?.source_domain, "WWW.AGENZ.MA");
  assert.equal(map.has("sub.agenz.ma"), false);
});

test("worker applies Source Policy Registry preflight before any Yandex network call", () => {
  const worker = readFileSync(join(process.cwd(), "scripts/openserp/confirm-seed-listing-candidates.ts"), "utf8");
  const policyLoad = worker.indexOf("const [seedRows, existingListingUrls, policies]");
  const policyMap = worker.indexOf("const policyByDomain = buildSeedConfirmationPolicyMap(policies)");
  const policyDecision = worker.indexOf("const policyDecision = evaluateSeedConfirmationPolicy(policy, policyNow)");
  const selection = worker.indexOf("const selected = selectBalancedSeedBatch(eligibleSeeds, batchSize)");
  const network = worker.indexOf("fetchYandexViaSearxng({");
  assert.ok(policyLoad >= 0);
  assert.ok(policyMap > policyLoad);
  assert.ok(policyDecision > policyMap);
  assert.ok(selection > policyDecision);
  assert.ok(network > selection);
  assert.match(worker, /policy_blocked_seed_rows/);
  assert.match(worker, /source_policy_registry/);
});
