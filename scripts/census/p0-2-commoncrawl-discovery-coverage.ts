#!/usr/bin/env tsx
// P0.2 — Common Crawl Discovery Coverage
// Read-only reconciliation of three existing truths:
//   1) production Source Registry policy for the exact commoncrawl channel;
//   2) structural listing-pattern readiness in source-domain-registry.json;
//   3) existing Common Crawl seed coverage in source_offer_seeds.
//
// No Common Crawl request, no source-site request, no WARC fetch, no DB write.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { loadSourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";
import type { MassIndexSourcePolicy } from "@/lib/acquisition-scale-v1/mass-index-source-policy";
import {
  buildCommonCrawlDiscoveryCoverage,
  summarizeCommonCrawlDiscoveryCoverage,
  type CommonCrawlSeedCoverage,
} from "@/lib/acquisition-scale-v1/commoncrawl-discovery-coverage";

const REPORT_PATH = join(process.cwd(), "data/audits/runtime/p0-2-commoncrawl-discovery-coverage.json");
const QUERY_CONCURRENCY = 4;

const POLICY_COLUMNS = [
  "source_domain",
  "allowed_discovery_channels",
  "review_status",
  "next_review_at",
  "no_bypass_required",
  "policy_hash",
  "acquisition_mode",
  "machine_gate",
  "ingestion_gate",
  "display_gate",
].join(",");

async function loadCommonCrawlPolicies(): Promise<MassIndexSourcePolicy[]> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("source_policy_registry")
    .select(POLICY_COLUMNS)
    .contains("allowed_discovery_channels", ["commoncrawl"])
    .order("source_domain", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MassIndexSourcePolicy[];
}

async function loadSeedCoverage(domains: string[]): Promise<CommonCrawlSeedCoverage[]> {
  const client = getSupabaseServerClient();
  const output: CommonCrawlSeedCoverage[] = [];

  for (let offset = 0; offset < domains.length; offset += QUERY_CONCURRENCY) {
    const chunk = domains.slice(offset, offset + QUERY_CONCURRENCY);
    const rows = await Promise.all(chunk.map(async (domain) => {
      const [countResult, latestResult] = await Promise.all([
        client
          .from("source_offer_seeds")
          .select("id", { count: "exact", head: true })
          .eq("seed_provider", "commoncrawl_cdx")
          .eq("source_domain", domain),
        client
          .from("source_offer_seeds")
          .select("last_observed_at")
          .eq("seed_provider", "commoncrawl_cdx")
          .eq("source_domain", domain)
          .order("last_observed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (countResult.error) throw countResult.error;
      if (latestResult.error) throw latestResult.error;
      return {
        source_domain: domain,
        seed_count: countResult.count ?? 0,
        latest_observed_at: latestResult.data?.last_observed_at ?? null,
      } satisfies CommonCrawlSeedCoverage;
    }));
    output.push(...rows);
  }

  return output.sort((a, b) => a.source_domain.localeCompare(b.source_domain));
}

export async function buildP02Report(now = new Date()) {
  const policies = await loadCommonCrawlPolicies();
  const domains = policies.map((policy) => policy.source_domain.trim().toLowerCase());
  const seedCoverage = await loadSeedCoverage(domains);
  const rows = buildCommonCrawlDiscoveryCoverage(
    policies,
    loadSourceDomainRegistry(),
    seedCoverage,
    now,
  );
  const summary = summarizeCommonCrawlDiscoveryCoverage(rows);

  return {
    schema_version: "p0-2-commoncrawl-discovery-coverage-v1",
    generated_at: now.toISOString(),
    authority: "public.source_policy_registry",
    structural_registry: "data/openserp/source-domain-registry.json",
    seed_table: "public.source_offer_seeds",
    discovery_channel: "commoncrawl",
    read_only: true,
    commoncrawl_request: false,
    source_site_request: false,
    warc_fetch: false,
    db_mutation: false,
    ...summary,
    rows,
  };
}

async function main() {
  const report = await buildP02Report();
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (!report.read_only || report.db_mutation || report.commoncrawl_request || report.source_site_request || report.warc_fetch) {
    throw new Error("P0.2 audit violated read-only/no-fetch contract");
  }
  if (report.commoncrawl_policy_domains === 0) {
    throw new Error("P0.2 found zero Common Crawl policy domains");
  }
  if (report.operational_policy_domains === 0) {
    throw new Error("P0.2 found zero operational Common Crawl policy domains");
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : JSON.stringify(error));
  process.exit(1);
});
