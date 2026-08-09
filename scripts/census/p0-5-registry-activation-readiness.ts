#!/usr/bin/env tsx
// P0.5 — Registry Activation Readiness Gate
// Read-only production audit. No source-site request, no Common Crawl request,
// no WARC/content fetch, no DB mutation, no Registry mutation, no harvest,
// no pattern activation and no canary write.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  P0_5_TARGET_DOMAINS,
  evaluateRegistryActivationReadiness,
  type RegistryActivationPolicy,
} from "@/lib/acquisition-scale-v1/registry-activation-readiness";

const OUTPUT_PATH = join(process.cwd(), "data/audits/runtime/p0-5-registry-activation-readiness.json");
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
  "authorization_status",
  "partnership_required",
  "legal_review_required",
  "discovery_policy",
  "detail_fetch_policy",
  "content_reuse_policy",
  "display_policy",
].join(",");

async function countRows(table: "source_offer_seeds" | "discovery_candidates", sourceDomain: string): Promise<number> {
  const client = getSupabaseServerClient();
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("source_domain", sourceDomain);
  if (error) throw new Error(`P0.5 ${table} count failed for ${sourceDomain}: ${error.message}`);
  return count ?? 0;
}

export async function runP0_5RegistryActivationReadiness() {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("source_policy_registry")
    .select(POLICY_COLUMNS)
    .in("source_domain", [...P0_5_TARGET_DOMAINS]);
  if (error) throw new Error(`P0.5 Source Registry read failed: ${error.message}`);

  const policies = (data ?? []) as unknown as RegistryActivationPolicy[];
  const byDomain = new Map(policies.map((policy) => [policy.source_domain, policy] as const));
  const rows = [];

  for (const sourceDomain of P0_5_TARGET_DOMAINS) {
    const policy = byDomain.get(sourceDomain) ?? null;
    const readiness = evaluateRegistryActivationReadiness(sourceDomain, policy, true);
    const [seedRows, discoveryCandidateRows] = await Promise.all([
      countRows("source_offer_seeds", sourceDomain),
      countRows("discovery_candidates", sourceDomain),
    ]);
    rows.push({
      ...readiness,
      p0_4_shadow_decision: "SHADOW_ACCEPTABLE" as const,
      seed_rows: seedRows,
      discovery_candidate_rows: discoveryCandidateRows,
    });
  }

  const report = {
    schema_version: "p0-5-registry-activation-readiness-v1",
    generated_at: new Date().toISOString(),
    authority: "public.source_policy_registry",
    target_cohort_source: "P0.4 SHADOW_ACCEPTABLE certified cohort",
    canary_scope: "commoncrawl_seed_only_internal",
    target_domains: P0_5_TARGET_DOMAINS.length,
    ready_for_canary_review: rows.filter((row) => row.ready).length,
    blocked_by_policy: rows.filter((row) => !row.ready).length,
    source_site_request: false,
    commoncrawl_request: false,
    warc_fetch: false,
    db_mutation: false,
    registry_mutation: false,
    harvest: false,
    pattern_activation: false,
    canary_write: false,
    rows,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invokedAsScript = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  runP0_5RegistryActivationReadiness().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
