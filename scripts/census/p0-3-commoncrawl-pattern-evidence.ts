#!/usr/bin/env tsx
// P0.3 — Common Crawl Pattern Evidence
// URL-index metadata only. No source-site request, no WARC/content fetch, no DB mutation.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildDomainPatternEvidence,
  type PatternEvidenceRecord,
} from "@/lib/acquisition-scale-v1/commoncrawl-pattern-evidence";
import {
  MASS_INDEX_COMMONCRAWL_CHANNEL,
  evaluateMassIndexDomains,
} from "@/lib/acquisition-scale-v1/mass-index-source-policy";
import { loadMassIndexSourcePolicies } from "@/lib/acquisition-scale-v1/mass-index-source-policy-db";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";

export const P0_3_TARGET_DOMAINS = [
  "agadirimmobilier.ma",
  "agadirimmobilier.org",
  "alamal-immobilier.ma",
  "capital-properties.ma",
  "christiesrealestatemorocco.com",
  "immo-maroc.com",
  "immobest.ma",
  "immobilier-a-marrakech.com",
  "immobilier-pro-maroc.com",
  "immohammedia.com",
  "immotaroudant.com",
  "leaderimmo.ma",
  "marrakech-luxury-properties.com",
  "mhproperties.ma",
  "nouraimmobilier.ma",
  "proimmobilier.ma",
  "rabatimmo.ma",
  "valfoncier.ma",
] as const;

const INDEXES = ["CC-MAIN-2026-25", "CC-MAIN-2026-21", "CC-MAIN-2026-17"] as const;
const LIMIT = 5_000;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
const USER_AGENT = "AkarFinder-P0.3-Pattern-Evidence/1.0 (+https://github.com/hraaaaf/Akarfinder)";
const OUTPUT_PATH = join(process.cwd(), "data/audits/runtime/p0-3-commoncrawl-pattern-evidence.json");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildPatternEvidenceIndexUrl(domain: string, index: string): string {
  return `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url,timestamp,status,mime&limit=${LIMIT}`;
}

export function parsePatternEvidenceLine(line: string, index: string): PatternEvidenceRecord | null {
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
  const endpoint = buildPatternEvidenceIndexUrl(domain, index);
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
      throw new Error(`Common Crawl URL-index failed for ${domain}/${index}: HTTP ${response.status}`);
    }
    await sleep(500 * 2 ** (attempt - 1));
  }

  const text = await response!.text();
  const records: PatternEvidenceRecord[] = [];
  for (const line of text.split("\n")) {
    const record = parsePatternEvidenceLine(line, index);
    if (!record) continue;
    const canonical = canonicalizeSourceUrl(record.url);
    const actualDomain = canonical ? extractDomain(canonical) : null;
    if (!canonical || actualDomain !== domain) continue;
    records.push({ ...record, url: canonical });
  }
  return records;
}

export async function runP0_3PatternEvidence() {
  const policies = await loadMassIndexSourcePolicies([...P0_3_TARGET_DOMAINS]);
  const policyEvaluation = evaluateMassIndexDomains(
    [...P0_3_TARGET_DOMAINS],
    MASS_INDEX_COMMONCRAWL_CHANNEL,
    policies,
  );
  const allowed = new Set(policyEvaluation.allowedDomains);

  const rows = [] as Array<ReturnType<typeof buildDomainPatternEvidence> & {
    indexes_succeeded: number;
    indexes_failed: number;
    request_failures: Array<{ index: string; error: string }>;
  }>;

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;

  for (const domain of P0_3_TARGET_DOMAINS) {
    if (!allowed.has(domain)) {
      rows.push({
        ...buildDomainPatternEvidence(domain, []),
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
        const batch = await fetchIndexRecords(domain, index);
        records.push(...batch);
        indexesSucceeded += 1;
        successfulRequests += 1;
      } catch (error) {
        failedRequests += 1;
        failures.push({ index, error: error instanceof Error ? error.message : String(error) });
      }
      await sleep(250);
    }

    rows.push({
      ...buildDomainPatternEvidence(domain, records),
      indexes_succeeded: indexesSucceeded,
      indexes_failed: failures.length,
      request_failures: failures,
    });
  }

  const stateCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.state] = (acc[row.state] ?? 0) + 1;
    return acc;
  }, {});

  const report = {
    schema_version: "p0-3-commoncrawl-pattern-evidence-v1",
    generated_at: new Date().toISOString(),
    authority: "public.source_policy_registry",
    discovery_channel: MASS_INDEX_COMMONCRAWL_CHANNEL,
    source: "Common Crawl URL-index metadata",
    target_cohort_source: "P0.2 POLICY_ALLOWED_PATTERN_MISSING certified cohort",
    target_domains: P0_3_TARGET_DOMAINS.length,
    policy_allowed_targets: policyEvaluation.allowedDomains.length,
    policy_blocked_targets: policyEvaluation.decisions.filter((decision) => !decision.allowed).length,
    commoncrawl_index_request: true,
    source_site_request: false,
    warc_fetch: false,
    db_mutation: false,
    registry_mutation: false,
    indexes: INDEXES,
    total_requests: totalRequests,
    successful_requests: successfulRequests,
    failed_requests: failedRequests,
    evidence_ready_domains:
      (stateCounts.STRONG_PATTERN_EVIDENCE ?? 0) + (stateCounts.REVIEWABLE_PATTERN_EVIDENCE ?? 0),
    strong_pattern_evidence_domains: stateCounts.STRONG_PATTERN_EVIDENCE ?? 0,
    reviewable_pattern_evidence_domains: stateCounts.REVIEWABLE_PATTERN_EVIDENCE ?? 0,
    insufficient_evidence_domains: stateCounts.INSUFFICIENT_URL_INDEX_EVIDENCE ?? 0,
    total_unique_urls: rows.reduce((sum, row) => sum + row.unique_urls, 0),
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
    evidence_ready_domains: report.evidence_ready_domains,
    strong_pattern_evidence_domains: report.strong_pattern_evidence_domains,
    reviewable_pattern_evidence_domains: report.reviewable_pattern_evidence_domains,
    insufficient_evidence_domains: report.insufficient_evidence_domains,
    total_unique_urls: report.total_unique_urls,
  }, null, 2));
  return report;
}

const invokedAsScript = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  runP0_3PatternEvidence().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
