#!/usr/bin/env tsx
// COMMONCRAWL-SEED-PROVENANCE-V1
// Canonical reporting for historical Common Crawl URL-index provenance.
// `seed_provider=commoncrawl_cdx` identifies provenance. `fresh_channels` is
// deliberately NOT used here because it represents current freshness evidence.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { COMMONCRAWL_MASS_SEED_PROVIDER } from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";

const DAY_MS = 24 * 60 * 60 * 1000;

type DomainRow = { source_domain: string };

async function exactCount(since?: string): Promise<number> {
  const client = getSupabaseServerClient();
  let query = client
    .from("source_offer_seeds")
    .select("id", { count: "exact", head: true })
    .eq("seed_provider", COMMONCRAWL_MASS_SEED_PROVIDER);
  if (since) query = query.gte("created_at", since);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function loadDomains(): Promise<string[]> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("source_offer_seeds")
    .select("source_domain")
    .eq("seed_provider", COMMONCRAWL_MASS_SEED_PROVIDER)
    .limit(100000);
  if (error) throw error;
  return [...new Set(((data ?? []) as DomainRow[]).map((row) => row.source_domain).filter(Boolean))].sort();
}

async function countDomain(domain: string): Promise<number> {
  const client = getSupabaseServerClient();
  const { count, error } = await client
    .from("source_offer_seeds")
    .select("id", { count: "exact", head: true })
    .eq("seed_provider", COMMONCRAWL_MASS_SEED_PROVIDER)
    .eq("source_domain", domain);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const generatedAt = new Date();
  const since24h = new Date(generatedAt.getTime() - DAY_MS).toISOString();
  const [total, created24h, domains] = await Promise.all([
    exactCount(),
    exactCount(since24h),
    loadDomains(),
  ]);
  const perDomain = Object.fromEntries(await Promise.all(
    domains.map(async (domain) => [domain, await countDomain(domain)] as const),
  ));

  console.log(JSON.stringify({
    ok: true,
    generated_at: generatedAt.toISOString(),
    provenance_field: "seed_provider",
    provenance_value: COMMONCRAWL_MASS_SEED_PROVIDER,
    freshness_field_excluded_from_provenance: "fresh_channels",
    total_commoncrawl_seeds: total,
    created_last_24h: created24h,
    domain_count: domains.length,
    per_domain: perDomain,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
