import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildExactCdxIndexUrl,
  classifyExactCdxRecords,
  evaluateStrictCommonCrawlPolicy,
  type ExactCdxRecord,
  type StrictCommonCrawlPolicyRow,
} from "@/lib/acquisition-scale-v1/commoncrawl-exact-revalidation";

const now = new Date("2026-08-31T09:00:00Z");
const validPolicy: StrictCommonCrawlPolicyRow = {
  source_domain: "agenz.ma",
  authorization_status: "unverified",
  acquisition_mode: "public_index_internal_only",
  discovery_policy: "public_index_only",
  display_policy: "canonical_link_only",
  machine_gate: "canonical_link_only",
  ingestion_gate: "canonical_link_only",
  display_gate: "external_tail_link_only",
  no_bypass_required: true,
  allowed_discovery_channels: ["public_index", "commoncrawl"],
  review_status: "current",
  next_review_at: "2026-09-06T21:36:00Z",
  policy_effective_at: "2026-08-23T21:36:00Z",
  policy_expires_at: "2026-09-06T21:36:00Z",
  max_revalidation_interval_days: 14,
  policy_hash: "abc123",
};

assert.equal(evaluateStrictCommonCrawlPolicy(validPolicy, now).allowed, true);
assert.equal(evaluateStrictCommonCrawlPolicy({ ...validPolicy, no_bypass_required: false }, now).allowed, false);
assert.equal(evaluateStrictCommonCrawlPolicy({ ...validPolicy, allowed_discovery_channels: ["public_index"] }, now).allowed, false);
assert.equal(evaluateStrictCommonCrawlPolicy({ ...validPolicy, policy_expires_at: "2026-08-30T00:00:00Z" }, now).allowed, false);
assert.equal(evaluateStrictCommonCrawlPolicy({ ...validPolicy, policy_effective_at: "2026-09-01T00:00:00Z" }, now).allowed, false);
assert.equal(evaluateStrictCommonCrawlPolicy({ ...validPolicy, ingestion_gate: "blocked" }, now).allowed, false);

const queryUrl = buildExactCdxIndexUrl("https://agenz.ma/annonces/123", "CC-MAIN-2026-34");
assert.ok(queryUrl.includes("matchType=exact"));
assert.ok(!queryUrl.includes("matchType=domain"));
assert.ok(queryUrl.includes("limit=10"));

const recentRecord: ExactCdxRecord = {
  url: "https://agenz.ma/annonces/123",
  timestamp: "20260830090000",
  status: "200",
  mime: "text/html",
  index: "CC-MAIN-2026-34",
};
const recent = classifyExactCdxRecords("https://agenz.ma/annonces/123", [recentRecord], 14, now);
assert.equal(recent.eligible, true);
assert.equal(recent.reason, "recent_exact_200_html");

const stale = classifyExactCdxRecords(
  "https://agenz.ma/annonces/123",
  [{ ...recentRecord, timestamp: "20260701090000" }],
  14,
  now,
);
assert.equal(stale.eligible, false);
assert.equal(stale.reason, "stale_only");

const wrongUrl = classifyExactCdxRecords(
  "https://agenz.ma/annonces/123",
  [{ ...recentRecord, url: "https://agenz.ma/annonces/999" }],
  14,
  now,
);
assert.equal(wrongUrl.eligible, false);
assert.equal(wrongUrl.reason, "no_exact_record");

const worker = readFileSync(resolve("scripts/openserp/commoncrawl-exact-revalidation-dry-run.ts"), "utf8");
const firstPolicyGate = worker.indexOf("const policies = await loadPolicies()")
const indexResolution = worker.indexOf("const indexResolution = await resolveLatestCdxIndexes()")
const livePolicyGate = worker.indexOf("const liveDecision = evaluateStrictCommonCrawlPolicy(policy, new Date())")
const exactFetch = worker.indexOf("records.push(...await fetchExactCdxRecords")
assert.ok(firstPolicyGate >= 0 && indexResolution > firstPolicyGate, "policy load/evaluation must precede collinfo network");
assert.ok(livePolicyGate >= 0 && exactFetch > livePolicyGate, "live policy recheck must precede exact CDX request");
assert.ok(!worker.includes(".update("), "dry-run must not update production data");
assert.ok(!worker.includes(".insert("), "dry-run must not insert production data");
assert.ok(!worker.includes(".delete("), "dry-run must not delete production data");
for (const domain of ["agenz.ma", "masaken.ma", "kawtarimmobilier.com"]) {
  assert.ok(worker.includes(`\"${domain}\"`), `bounded source scope must include ${domain}`);
}

console.log("commoncrawl exact revalidation dry-run contract: PASS");
