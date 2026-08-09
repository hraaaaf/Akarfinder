#!/usr/bin/env tsx
// P0.4 — Registry Pattern Review Shadow
// Common Crawl URL-index metadata only. No source-site request, no WARC/content fetch,
// no DB mutation, no Registry mutation, no harvest and no pattern activation.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { PatternEvidenceRecord } from "@/lib/acquisition-scale-v1/commoncrawl-pattern-evidence";
import {
  P0_4_PATTERN_PROPOSALS,
  P0_4_STRONG_DOMAINS,
  replayPatternProposal,
} from "@/lib/acquisition-scale-v1/registry-pattern-review-shadow";
import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexDomains,
} from "@/lib/acquisition-scale-v1/mass-index-source-policy";
import { loadMassIndexSourcePolicies } from "@/lib/acquisition-scale-v1/mass-index-source-policy-db";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";

const INDEXES = ["CC-MAIN-2026-25", "CC-MAIN-2026-21", "CC-MAIN-2026-17"] as const;
const LIMIT = 5_000;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
const USER_AGENT = "AkarFinder-P0.4-Pattern-Shadow/1.0 (+https://github.com/hraaaaf/Akarfinder)";
const OUTPUT_PATH = join(process.cwd(), "data/audits/runtime/p0-4-registry-pattern-review-shadow.json");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildP0_4IndexUrl(domain: string, index: string): string {
  return `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url,timestamp,status,mime&limit=${LIMIT}`;
}

export function parseP0_4IndexLine(line: string, index: string): PatternEvidenceRecord | null {
  if (!line.trim()) return null;
  try {
    const parsed = JSON.parse(line) as { url?: string; timestamp?: string; status?: string; mime?: string; mimetype?: string };
    if (!parsed.url || !parsed.timestamp) return null;
    return {
      url: parsed.url,
      timestamp: parsed.timestamp,
      status: parsed.status,
      mime: parsed.mime ?? parsed.mimetype,
      index,
    };
  } catch {
    return null;
  }
}

async function fetchIndexRecords(domain: string, index: string): Promise<PatternEvidenceRecord[]> {
  const endpoint = buildP0_4IndexUrl(domain, index);
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    response = await fetch(endpoint, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.1",
      },
    });
    if (response.status === 404) return [];
    if (response.ok) break;
    if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(`P0.4 Common Crawl URL-index failed for ${domain}/${index}: HTTP ${response.status}`);
    }
    await sleep(500 * 2 ** (attempt - 1));
  }

  const text = await response!.text();
  const records: PatternEvidenceRecord[] = [];
  for (const line of text.split("\n")) {
    const record = parseP0_4IndexLine(line, index);
    if (!record) continue;
    const canonical = canonicalizeSourceUrl(record.url);
    const actualDomain = canonical ? extractDomain(canonical) : null;
    if (!canonical || actualDomain !== domain) continue;
    records.push({ ...record, url: canonical });
  }
  return records;
}

export async function runP0_4RegistryPatternReviewShadow() {
  const policies = await loadMassIndexSourcePolicies([...P0_4_STRONG_DOMAINS]);
  const policyEvaluation = evaluateMassIndexDomains(
    [...P0_4_STRONG_DOMAINS],
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policies,
  );
  const allowed = new Set(policyEvaluation.allowedDomains);

  const rows = [] as Array<ReturnType<typeof replayPatternProposal> & {
    rationale: string;
    expected_positive_signatures: string[];
    indexes_succeeded: number;
    indexes_failed: number;
    request_failures: Array<{ index: string; error: string }>;
  }>;

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;

  for (const proposal of P0_4_PATTERN_PROPOSALS) {
    if (!allowed.has(proposal.source_domain)) {
      rows.push({
        ...replayPatternProposal(proposal, []),
        rationale: proposal.rationale,
        expected_positive_signatures: proposal.expected_positive_signatures,
        indexes_succeeded: 0,
        indexes_failed: 0,
        request_failures: [],
      });
      continue;
    }

    const records: PatternEvidenceRecord[] = [];
    const failures: Array<{ index: string; error: string }> = [];
    let indexesSucceeded = 0;

    for (const index of INDEXES) {
      totalRequests += 1;
      try {
        records.push(...await fetchIndexRecords(proposal.source_domain, index));
        indexesSucceeded += 1;
        successfulRequests += 1;
      } catch (error) {
        failedRequests += 1;
        failures.push({
          index,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      await sleep(250);
    }

    rows.push({
      ...replayPatternProposal(proposal, records),
      rationale: proposal.rationale,
      expected_positive_signatures: proposal.expected_positive_signatures,
      indexes_succeeded: indexesSucceeded,
      indexes_failed: failures.length,
      request_failures: failures,
    });
  }

  const accepted = rows.filter((row) => row.decision === "SHADOW_ACCEPTABLE");
  const rejected = rows.filter((row) => row.decision === "REJECTED_SHADOW");
  const report = {
    schema_version: "p0-4-registry-pattern-review-shadow-v1",
    generated_at: new Date().toISOString(),
    authority: "public.source_policy_registry",
    discovery_channel: MASS_INDEX_COMMONCRAWL_CHANNEL,
    source: "Common Crawl URL-index metadata",
    target_cohort_source: "P0.3 STRONG_PATTERN_EVIDENCE certified cohort",
    target_domains: P0_4_STRONG_DOMAINS.length,
    policy_allowed_targets: policyEvaluation.allowedDomains.length,
    policy_blocked_targets: policyEvaluation.decisions.filter((decision) => !decision.allowed).length,
    commoncrawl_index_request: true,
    source_site_request: false,
    warc_fetch: false,
    db_mutation: false,
    registry_mutation: false,
    harvest: false,
    pattern_activation: false,
    semantic_listing_truth_claimed: false,
    indexes: INDEXES,
    total_requests: totalRequests,
    successful_requests: successfulRequests,
    failed_requests: failedRequests,
    shadow_acceptable_domains: accepted.length,
    rejected_shadow_domains: rejected.length,
    total_false_positives: rows.reduce((sum, row) => sum + row.false_positives, 0),
    total_false_negatives: rows.reduce((sum, row) => sum + row.false_negatives, 0),
    policy_decisions: policyEvaluation.decisions,
    rows,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    target_domains: report.target_domains,
    policy_allowed_targets: report.policy_allowed_targets,
    successful_requests: report.successful_requests,
    failed_requests: report.failed_requests,
    shadow_acceptable_domains: report.shadow_acceptable_domains,
    rejected_shadow_domains: report.rejected_shadow_domains,
    total_false_positives: report.total_false_positives,
    total_false_negatives: report.total_false_negatives,
    rows: rows.map((row) => ({
      source_domain: row.source_domain,
      decision: row.decision,
      positives: row.positives,
      negatives: row.negatives,
      false_positives: row.false_positives,
      false_negatives: row.false_negatives,
      precision: row.precision,
      recall: row.recall,
      rejection_reasons: row.rejection_reasons,
    })),
  }, null, 2));
  return report;
}

const invokedAsScript = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  runP0_4RegistryPatternReviewShadow().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
