import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexExternalIndexPolicy,
  type MassIndexSourcePolicy,
} from "../../../lib/acquisition-scale-v1/mass-index-source-policy";
import {
  buildCommonCrawlPolicyProjection,
  getPolicyReviewAlert,
  prepareCommonCrawlPolicyGate,
} from "../../openserp/commoncrawl-registry-mass-harvest";

const NOW = new Date("2026-08-23T12:00:00.000Z");

function policy(
  sourceDomain: string,
  overrides: Partial<MassIndexSourcePolicy> = {},
): MassIndexSourcePolicy {
  return {
    source_domain: sourceDomain,
    allowed_discovery_channels: [MASS_INDEX_COMMONCRAWL_CHANNEL],
    review_status: "current",
    next_review_at: "2026-09-01T12:00:00.000Z",
    no_bypass_required: true,
    policy_hash: `policy:${sourceDomain}`,
    acquisition_mode: "blocked",
    machine_gate: "allowed",
    ingestion_gate: "blocked_content_reuse",
    display_gate: "blocked",
    ...overrides,
  };
}

test("minimal external CDX plane ignores content acquisition/reuse gates but preserves canonical policy gates", () => {
  const sourcePolicy = policy("example.ma");
  const decision = evaluateMassIndexExternalIndexPolicy(
    "example.ma",
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    sourcePolicy,
    NOW,
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "allowed");

  const projection = buildCommonCrawlPolicyProjection(["example.ma"], [sourcePolicy], NOW);
  assert.deepEqual(projection.policyEvaluation.allowedDomains, ["example.ma"]);

  const accessPlan = projection.policyReport.m3_access_plans[0].access_plan;
  assert.equal(accessPlan.externalIndex.eligible, true);
  assert.equal(accessPlan.externalIndex.mode, "MINIMAL_EXTERNAL_INDEX");
  assert.equal(accessPlan.externalIndex.sourceNetworkRequestsAllowed, false);
  assert.equal(accessPlan.externalIndex.sourceContentReuseAllowed, false);
  assert.equal(accessPlan.ingestionAndReuse.authorized, false);
  assert.equal(accessPlan.ingestionAndReuse.evidenceReference, null);
  assert.deepEqual(accessPlan.ingestionAndReuse.allowedChannels, []);
  assert.equal(projection.policyReport.m3_access_planes_separated, true);
});

test("expired review remains blocked on the minimal external-index plane", () => {
  const sourcePolicy = policy("expired.ma", {
    next_review_at: "2026-08-22T12:00:00.000Z",
  });

  const decision = evaluateMassIndexExternalIndexPolicy(
    "expired.ma",
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    sourcePolicy,
    NOW,
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "policy_review_not_current");
});

test("sitemap-only policy remains channel_not_allowed even when its review is also expired", () => {
  const sourcePolicy = policy("sitemap-only.ma", {
    allowed_discovery_channels: ["public_sitemap"],
    next_review_at: "2026-08-22T12:00:00.000Z",
  });

  const decision = evaluateMassIndexExternalIndexPolicy(
    "sitemap-only.ma",
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    sourcePolicy,
    NOW,
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "channel_not_allowed");
});

test("machine/no-bypass gates remain mandatory for minimal external indexing", () => {
  const invalidNoBypass = evaluateMassIndexExternalIndexPolicy(
    "no-bypass.ma",
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policy("no-bypass.ma", { no_bypass_required: false }),
    NOW,
  );
  assert.equal(invalidNoBypass.allowed, false);
  assert.equal(invalidNoBypass.reason, "invalid_no_bypass");

  const blockedMachine = evaluateMassIndexExternalIndexPolicy(
    "machine-blocked.ma",
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policy("machine-blocked.ma", { machine_gate: "blocked_policy" }),
    NOW,
  );
  assert.equal(blockedMachine.allowed, false);
  assert.equal(blockedMachine.reason, "machine_gate_blocked");
});

test("review alerts classify J-7, J-3 and J-1 without alerting expired or >J-7 reviews", () => {
  assert.deepEqual(
    getPolicyReviewAlert("2026-08-30T12:00:00.000Z", NOW),
    { days_until_policy_review_due: 7, policy_review_alert: "J-7" },
  );
  assert.deepEqual(
    getPolicyReviewAlert("2026-08-26T12:00:00.000Z", NOW),
    { days_until_policy_review_due: 3, policy_review_alert: "J-3" },
  );
  assert.deepEqual(
    getPolicyReviewAlert("2026-08-24T12:00:00.000Z", NOW),
    { days_until_policy_review_due: 1, policy_review_alert: "J-1" },
  );
  assert.equal(getPolicyReviewAlert("2026-08-31T12:00:00.000Z", NOW), null);
  assert.equal(getPolicyReviewAlert("2026-08-22T12:00:00.000Z", NOW), null);
});

test("zero-authorized gate writes the diagnostic artifact before failing closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "akarfinder-p0-1-"));
  const reportPath = join(directory, "nested", "p0-1-commoncrawl-policy-projection.json");

  try {
    const policies = [
      policy("expired.ma", { next_review_at: "2026-08-22T12:00:00.000Z" }),
      policy("sitemap-only.ma", {
        allowed_discovery_channels: ["public_sitemap"],
        next_review_at: "2026-08-22T12:00:00.000Z",
      }),
    ];

    assert.throws(
      () => prepareCommonCrawlPolicyGate(
        ["expired.ma", "sitemap-only.ma"],
        policies,
        reportPath,
        NOW,
      ),
      /zero policy-authorized domains/,
    );

    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      structural_candidate_domains: number;
      allowed_domains: string[];
      rejected_domains: Array<{ source_domain: string; reason: string }>;
      rejection_breakdown: Record<string, number>;
      m3_access_planes_separated: boolean;
      fail_closed: boolean;
      authority: string;
    };

    assert.equal(report.structural_candidate_domains, 2);
    assert.deepEqual(report.allowed_domains, []);
    assert.deepEqual(
      report.rejected_domains.map((item) => [item.source_domain, item.reason]),
      [
        ["expired.ma", "policy_review_not_current"],
        ["sitemap-only.ma", "channel_not_allowed"],
      ],
    );
    assert.deepEqual(report.rejection_breakdown, {
      policy_review_not_current: 1,
      channel_not_allowed: 1,
    });
    assert.equal(report.m3_access_planes_separated, true);
    assert.equal(report.fail_closed, true);
    assert.equal(report.authority, "public.source_policy_registry");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
