import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCommonCrawlDiscoveryCoverage,
  summarizeCommonCrawlDiscoveryCoverage,
} from "../../../lib/acquisition-scale-v1/commoncrawl-discovery-coverage.js";
import type { SourceDomainRegistry } from "../../../lib/openserp-ingestion/domain-registry.js";
import type { MassIndexSourcePolicy } from "../../../lib/acquisition-scale-v1/mass-index-source-policy.js";

const NOW = new Date("2026-08-09T09:00:00.000Z");

function policy(domain: string, overrides: Partial<MassIndexSourcePolicy> = {}): MassIndexSourcePolicy {
  return {
    source_domain: domain,
    allowed_discovery_channels: ["public_index", "commoncrawl"],
    review_status: "current",
    next_review_at: "2026-08-20T09:00:00.000Z",
    no_bypass_required: true,
    policy_hash: `hash-${domain}`,
    acquisition_mode: "public_index_internal_only",
    machine_gate: "internal_signal_only",
    ingestion_gate: "internal_signal_only",
    display_gate: "hidden",
    ...overrides,
  };
}

const registry: SourceDomainRegistry = {
  registry_version: "fixture",
  generated_at: NOW.toISOString(),
  note: "fixture",
  domains: [
    {
      domain: "ready.ma",
      status: "approved_discovery",
      listing_url_patterns: ["/listing/\\d+$"],
      blocked_url_patterns: [],
      source_type: "fixture",
      external_web_result: true,
      compliance_note: "fixture",
      reviewed_at: "2026-08-01",
    },
    {
      domain: "ready-empty.ma",
      status: "approved_discovery",
      listing_url_patterns: ["/property/"],
      blocked_url_patterns: [],
      source_type: "fixture",
      external_web_result: true,
      compliance_note: "fixture",
      reviewed_at: "2026-08-01",
    },
    {
      domain: "no-pattern.ma",
      status: "approved_discovery",
      listing_url_patterns: [],
      blocked_url_patterns: [],
      source_type: "fixture",
      external_web_result: true,
      compliance_note: "fixture",
      reviewed_at: "2026-08-01",
    },
  ],
};

test("classifies operational policy + structural pattern as HARVEST_READY", () => {
  const rows = buildCommonCrawlDiscoveryCoverage(
    [policy("ready.ma")],
    registry,
    [{ source_domain: "ready.ma", seed_count: 12, latest_observed_at: "2026-08-08T00:00:00Z" }],
    NOW,
  );
  assert.equal(rows[0].state, "HARVEST_READY");
  assert.equal(rows[0].seed_count, 12);
});

test("classifies operational policy without structural harvest readiness as POLICY_ALLOWED_PATTERN_MISSING", () => {
  const rows = buildCommonCrawlDiscoveryCoverage([policy("no-pattern.ma")], registry, [], NOW);
  assert.equal(rows[0].state, "POLICY_ALLOWED_PATTERN_MISSING");
  assert.equal(rows[0].structural_harvest_ready, false);
});

test("unknown structural domain remains pattern-missing and is never auto-approved", () => {
  const rows = buildCommonCrawlDiscoveryCoverage([policy("unknown.ma")], registry, [], NOW);
  assert.equal(rows[0].state, "POLICY_ALLOWED_PATTERN_MISSING");
});

test("expired or blocked policy wins over structural readiness", () => {
  const expired = buildCommonCrawlDiscoveryCoverage(
    [policy("ready.ma", { next_review_at: "2026-08-09T08:59:59.000Z" })],
    registry,
    [],
    NOW,
  );
  assert.equal(expired[0].state, "POLICY_EXPIRED_OR_BLOCKED");

  const blocked = buildCommonCrawlDiscoveryCoverage(
    [policy("ready.ma", { machine_gate: "blocked_review_overdue" })],
    registry,
    [],
    NOW,
  );
  assert.equal(blocked[0].state, "POLICY_EXPIRED_OR_BLOCKED");
});

test("summary proves seed coverage separately for ready, missing-pattern and blocked cohorts", () => {
  const rows = buildCommonCrawlDiscoveryCoverage(
    [
      policy("ready.ma"),
      policy("ready-empty.ma"),
      policy("no-pattern.ma"),
      policy("expired.ma", { review_status: "overdue", next_review_at: "2026-08-01T00:00:00Z", machine_gate: "blocked_review_overdue", ingestion_gate: "blocked_review_overdue" }),
    ],
    registry,
    [
      { source_domain: "ready.ma", seed_count: 10, latest_observed_at: null },
      { source_domain: "ready-empty.ma", seed_count: 0, latest_observed_at: null },
      { source_domain: "no-pattern.ma", seed_count: 2, latest_observed_at: null },
      { source_domain: "expired.ma", seed_count: 3, latest_observed_at: null },
    ],
    NOW,
  );
  const summary = summarizeCommonCrawlDiscoveryCoverage(rows);
  assert.equal(summary.commoncrawl_policy_domains, 4);
  assert.equal(summary.operational_policy_domains, 3);
  assert.equal(summary.harvest_ready_domains, 2);
  assert.equal(summary.pattern_missing_domains, 1);
  assert.equal(summary.expired_or_blocked_domains, 1);
  assert.equal(summary.harvest_ready_ratio, 0.6667);
  assert.equal(summary.commoncrawl_seed_rows_on_policy_domains, 15);
  assert.equal(summary.harvest_ready_seed_rows, 10);
  assert.equal(summary.pattern_missing_seed_rows, 2);
  assert.equal(summary.expired_or_blocked_seed_rows, 3);
  assert.equal(summary.harvest_ready_zero_seed_domains, 1);
  assert.equal(summary.pattern_missing_zero_seed_domains, 0);
});
