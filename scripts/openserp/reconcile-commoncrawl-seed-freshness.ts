#!/usr/bin/env tsx
// CASABLANCA-MASS-ACQUISITION-V1 — exact-match seed freshness reconciliation.
//
// Historical Common Crawl seeds are matched ONLY by exact canonical URL to
// accepted/promoted fresh discovery_candidates. No direct page fetch, fuzzy
// match, title similarity, phone, image or inferred identity is used.
// Default is dry-run. --apply uses the existing 3 Production ingestion flags.
//
// DATA-4.3I: this writer owns only `openserp_yandex_discovery`. It must never
// downgrade or erase freshness evidence owned by another channel.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { computeChannelOwnedFreshnessUpdateBatch, type ExistingSeedFreshnessState } from "@/lib/seed-freshness/job";
import { formatSupabaseError, withSupabaseRetry } from "@/lib/seed-freshness/supabase-retry";
import {
  matchSeedsToFreshObservations,
  summarizeFreshnessResults,
  type FreshDiscoveryObservation,
  type FreshnessStatus,
  type SeedForMatching,
} from "@/lib/seed-freshness/matcher";

const PAGE_SIZE = 1000;
// Production showed statement-timeout pressure while 25 PATCH requests were
// emitted concurrently. Keep this deliberately conservative: freshness writes
// are idempotent and correctness is more important than burst throughput.
const UPDATE_CONCURRENCY = 5;

type SeedDbRow = SeedForMatching & {
  freshness_status: FreshnessStatus;
  fresh_last_seen_at: string | null;
  fresh_channels: string[] | null;
};

async function loadAllSeeds(): Promise<SeedDbRow[]> {
  const client = getSupabaseServerClient();
  const out: SeedDbRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = await withSupabaseRetry(async () => {
      const { data, error } = await client
        .from("source_offer_seeds")
        .select("canonical_url,source_domain,freshness_status,fresh_last_seen_at,fresh_channels")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as SeedDbRow[];
    }, `load source_offer_seeds offset=${from}`);
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function loadFreshObservations(): Promise<FreshDiscoveryObservation[]> {
  const client = getSupabaseServerClient();
  const out: FreshDiscoveryObservation[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = await withSupabaseRetry(async () => {
      const { data, error } = await client
        .from("discovery_candidates")
        .select("canonical_url,source_url,discovered_at,discovery_status")
        .in("discovery_status", ["accepted", "promoted_to_source_offer"])
        .order("discovered_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as FreshDiscoveryObservation[];
    }, `load discovery_candidates offset=${from}`);
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function applyUpdates(updates: ReturnType<typeof computeChannelOwnedFreshnessUpdateBatch>): Promise<void> {
  const client = getSupabaseServerClient();
  for (let offset = 0; offset < updates.length; offset += UPDATE_CONCURRENCY) {
    const chunk = updates.slice(offset, offset + UPDATE_CONCURRENCY);
    await Promise.all(chunk.map(async (update) => {
      await withSupabaseRetry(async () => {
        const { error } = await client
          .from("source_offer_seeds")
          .update({
            freshness_status: update.freshness_status,
            fresh_last_seen_at: update.fresh_last_seen_at,
            fresh_channels: update.fresh_channels,
            updated_at: update.updated_at,
          })
          .eq("canonical_url", update.canonical_url);
        if (error) throw error;
      }, `update source_offer_seeds canonical_url=${update.canonical_url}`);
    }));
  }
}

async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  const seeds = await loadAllSeeds();
  const observations = await loadFreshObservations();
  const now = new Date();
  const existingByUrl = new Map<string, ExistingSeedFreshnessState>(seeds.map((seed) => [seed.canonical_url, {
    freshness_status: seed.freshness_status,
    fresh_last_seen_at: seed.fresh_last_seen_at,
    fresh_channels: seed.fresh_channels ?? [],
  }]));
  const seedInputs: SeedForMatching[] = seeds.map(({ canonical_url, source_domain }) => ({ canonical_url, source_domain }));
  const results = matchSeedsToFreshObservations(seedInputs, observations, now);
  const updates = computeChannelOwnedFreshnessUpdateBatch(seedInputs, observations, existingByUrl, now);
  const summary = summarizeFreshnessResults(results);
  const protectedForeignChannelRows = seeds.filter((seed) => (seed.fresh_channels ?? []).some((channel) => channel !== "openserp_yandex_discovery")).length;

  if (!apply) {
    console.log(JSON.stringify({
      ok: true,
      status: "DRY_RUN",
      ...summary,
      accepted_fresh_observations: observations.length,
      changed_rows: updates.length,
      protected_foreign_channel_rows: protectedForeignChannelRows,
    }, null, 2));
    return;
  }

  if (!isOpenSerpIngestionCronAuthorized()) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_FLAGS_DISABLED", ...summary, changed_rows: updates.length, protected_foreign_channel_rows: protectedForeignChannelRows }, null, 2));
    return;
  }

  await applyUpdates(updates);
  console.log(JSON.stringify({
    ok: true,
    status: "APPLIED",
    ...summary,
    accepted_fresh_observations: observations.length,
    changed_rows: updates.length,
    protected_foreign_channel_rows: protectedForeignChannelRows,
  }, null, 2));
}

void main().catch((error) => {
  console.error(`[seed-freshness] fatal: ${formatSupabaseError(error)}`);
  process.exit(1);
});
