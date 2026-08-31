#!/usr/bin/env tsx
// Read-only bounded measurement of exact-URL Common Crawl revalidation yield.
// It queries only the Common Crawl URL index. It never fetches source pages,
// never downloads WARC content and never writes production data.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  classifyExactCdxRecords,
  evaluateStrictCommonCrawlPolicy,
  fetchExactCdxRecords,
  resolveLatestCdxIndexes,
  type ExactCdxRecord,
  type StrictCommonCrawlPolicyRow,
} from "@/lib/acquisition-scale-v1/commoncrawl-exact-revalidation";

const TARGET_DOMAINS = ["agenz.ma", "masaken.ma", "kawtarimmobilier.com"] as const;
const DEFAULT_BATCH_PER_SOURCE = 20;
const MAX_BATCH_PER_SOURCE = 40;
const REQUEST_PACING_MS = 250;
const REPORT_PATH = "data/audits/runtime/commoncrawl-exact-revalidation-dry-run.json";

type SeedRow = {
  canonical_url: string;
  source_domain: string;
  last_observed_at: string;
};

type SourceMetrics = {
  source_domain: string;
  policy_allowed: boolean;
  policy_reason: string;
  selected: number;
  attempted: number;
  network_requests: number;
  eligible_recent_exact_200_html: number;
  no_exact_record: number;
  no_200_html: number;
  stale_only: number;
  network_error: number;
  latest_eligible_observed_at: string | null;
};

function positiveIntEnv(name: string, fallback: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPolicies(): Promise<StrictCommonCrawlPolicyRow[]> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("source_policy_registry")
    .select("source_domain,authorization_status,acquisition_mode,discovery_policy,display_policy,machine_gate,ingestion_gate,display_gate,no_bypass_required,allowed_discovery_channels,review_status,next_review_at,policy_effective_at,policy_expires_at,max_revalidation_interval_days,policy_hash")
    .in("source_domain", [...TARGET_DOMAINS]);
  if (error) throw error;
  return (data ?? []) as unknown as StrictCommonCrawlPolicyRow[];
}

async function loadStaleSeeds(policy: StrictCommonCrawlPolicyRow, limit: number, now: Date): Promise<SeedRow[]> {
  const maxDays = policy.max_revalidation_interval_days ?? 0;
  const cutoff = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000).toISOString();
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("source_offer_seeds")
    .select("canonical_url,source_domain,last_observed_at")
    .eq("source_domain", policy.source_domain)
    .eq("seed_provider", "commoncrawl_cdx")
    .eq("freshness_status", "seed_only")
    .lt("last_observed_at", cutoff)
    .order("last_observed_at", { ascending: false })
    .order("canonical_url", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as SeedRow[];
}

function recordRejection(metrics: SourceMetrics, reason: "no_exact_record" | "no_200_html" | "stale_only") {
  if (reason === "no_exact_record") metrics.no_exact_record += 1;
  else if (reason === "no_200_html") metrics.no_200_html += 1;
  else metrics.stale_only += 1;
}

async function main() {
  const startedAt = new Date();
  const batchPerSource = positiveIntEnv("CC_EXACT_BATCH_PER_SOURCE", DEFAULT_BATCH_PER_SOURCE, MAX_BATCH_PER_SOURCE);

  // Source Policy Registry is loaded and evaluated before ANY Common Crawl request.
  const policies = await loadPolicies();
  const policyByDomain = new Map(policies.map((policy) => [policy.source_domain, policy] as const));
  const policyDecisions = TARGET_DOMAINS.map((domain) => {
    const decision = evaluateStrictCommonCrawlPolicy(policyByDomain.get(domain), startedAt);
    return { domain, decision };
  });
  const allowed = policyDecisions.filter(({ decision }) => decision.allowed);
  if (allowed.length === 0) throw new Error("fail-closed: zero policy-authorized Common Crawl sources");

  const selectedByDomain = new Map<string, SeedRow[]>();
  for (const { domain } of allowed) {
    const policy = policyByDomain.get(domain)!;
    selectedByDomain.set(domain, await loadStaleSeeds(policy, batchPerSource, startedAt));
  }

  // First external network request happens only after the policy gate above.
  const indexResolution = await resolveLatestCdxIndexes();
  const metricsByDomain = new Map<string, SourceMetrics>();
  const samples: Array<{
    source_domain: string;
    canonical_url: string;
    previous_last_observed_at: string;
    outcome: string;
    latest_exact_observed_at: string | null;
    latest_eligible_observed_at: string | null;
    indexes_queried: string[];
  }> = [];

  for (const domain of TARGET_DOMAINS) {
    const initialDecision = policyDecisions.find((item) => item.domain === domain)!.decision;
    metricsByDomain.set(domain, {
      source_domain: domain,
      policy_allowed: initialDecision.allowed,
      policy_reason: initialDecision.reason,
      selected: selectedByDomain.get(domain)?.length ?? 0,
      attempted: 0,
      network_requests: 0,
      eligible_recent_exact_200_html: 0,
      no_exact_record: 0,
      no_200_html: 0,
      stale_only: 0,
      network_error: 0,
      latest_eligible_observed_at: null,
    });
  }

  for (const { domain } of allowed) {
    const policy = policyByDomain.get(domain)!;
    const metrics = metricsByDomain.get(domain)!;
    for (const seed of selectedByDomain.get(domain) ?? []) {
      // Re-evaluate time-sensitive policy immediately before the URL-index requests.
      const liveDecision = evaluateStrictCommonCrawlPolicy(policy, new Date());
      if (!liveDecision.allowed) {
        metrics.policy_allowed = false;
        metrics.policy_reason = liveDecision.reason;
        break;
      }

      metrics.attempted += 1;
      const records: ExactCdxRecord[] = [];
      const indexesQueried: string[] = [];
      let networkFailed = false;
      for (const index of indexResolution.indexes) {
        try {
          indexesQueried.push(index);
          metrics.network_requests += 1;
          records.push(...await fetchExactCdxRecords(seed.canonical_url, index));
          const interim = classifyExactCdxRecords(seed.canonical_url, records, liveDecision.max_revalidation_interval_days!, new Date());
          if (interim.eligible) break;
        } catch {
          networkFailed = true;
          break;
        }
        await sleep(REQUEST_PACING_MS);
      }

      if (networkFailed) {
        metrics.network_error += 1;
        samples.push({
          source_domain: domain,
          canonical_url: seed.canonical_url,
          previous_last_observed_at: seed.last_observed_at,
          outcome: "network_error",
          latest_exact_observed_at: null,
          latest_eligible_observed_at: null,
          indexes_queried: indexesQueried,
        });
        continue;
      }

      const classification = classifyExactCdxRecords(
        seed.canonical_url,
        records,
        liveDecision.max_revalidation_interval_days!,
        new Date(),
      );
      if (classification.eligible) {
        metrics.eligible_recent_exact_200_html += 1;
        if (!metrics.latest_eligible_observed_at || (classification.latest_eligible_observed_at ?? "") > metrics.latest_eligible_observed_at) {
          metrics.latest_eligible_observed_at = classification.latest_eligible_observed_at;
        }
      } else {
        recordRejection(metrics, classification.reason as "no_exact_record" | "no_200_html" | "stale_only");
      }
      samples.push({
        source_domain: domain,
        canonical_url: seed.canonical_url,
        previous_last_observed_at: seed.last_observed_at,
        outcome: classification.reason,
        latest_exact_observed_at: classification.latest_exact_observed_at,
        latest_eligible_observed_at: classification.latest_eligible_observed_at,
        indexes_queried: indexesQueried,
      });
    }
  }

  const sources = [...metricsByDomain.values()];
  const attempted = sources.reduce((sum, item) => sum + item.attempted, 0);
  const eligible = sources.reduce((sum, item) => sum + item.eligible_recent_exact_200_html, 0);
  const report = {
    ok: true,
    status: "DRY_RUN_READ_ONLY",
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    batch_per_source: batchPerSource,
    source_scope: [...TARGET_DOMAINS],
    cdx_indexes: indexResolution.indexes,
    cdx_index_resolution: indexResolution.source,
    contract: {
      commoncrawl_url_index_only: true,
      exact_url_query_only: true,
      source_page_fetch: false,
      warc_fetch: false,
      production_write: false,
      policy_gate_before_network: true,
    },
    attempted,
    eligible_recent_exact_200_html: eligible,
    yield_rate: attempted === 0 ? 0 : eligible / attempted,
    sources,
    samples,
  };

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

void main().catch((error) => {
  console.error(`[commoncrawl-exact-revalidation] fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
