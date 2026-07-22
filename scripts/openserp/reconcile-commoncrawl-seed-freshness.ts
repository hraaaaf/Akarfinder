#!/usr/bin/env tsx
// CASABLANCA-MASS-ACQUISITION-V1 — exact-match seed freshness reconciliation.
//
// Historical Common Crawl seeds are matched ONLY by exact canonical URL to
// accepted/promoted fresh discovery_candidates. No direct page fetch, fuzzy
// match, title similarity, phone, image or inferred identity is used.
// Default is dry-run. --apply uses the existing 3 Production ingestion flags.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { computeFreshnessUpdateBatch } from "@/lib/seed-freshness/job";
import {
  matchSeedsToFreshObservations,
  summarizeFreshnessResults,
  type FreshDiscoveryObservation,
  type FreshnessStatus,
  type SeedForMatching,
} from "@/lib/seed-freshness/matcher";

const PAGE_SIZE = 1000;
const UPDATE_CONCURRENCY = 25;

type SeedDbRow = SeedForMatching & { freshness_status: FreshnessStatus };

async function loadAllSeeds(): Promise<SeedDbRow[]> {
  const client = getSupabaseServerClient();
  const out: SeedDbRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("source_offer_seeds")
      .select("canonical_url,source_domain,freshness_status")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as SeedDbRow[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function loadFreshObservations(): Promise<FreshDiscoveryObservation[]> {
  const client = getSupabaseServerClient();
  const out: FreshDiscoveryObservation[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("discovery_candidates")
      .select("canonical_url,source_url,discovered_at,discovery_status")
      .in("discovery_status", ["accepted", "promoted_to_source_offer"])
      .order("discovered_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as FreshDiscoveryObservation[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function applyUpdates(updates: ReturnType<typeof computeFreshnessUpdateBatch>): Promise<void> {
  const client = getSupabaseServerClient();
  for (let offset = 0; offset < updates.length; offset += UPDATE_CONCURRENCY) {
    const chunk = updates.slice(offset, offset + UPDATE_CONCURRENCY);
    await Promise.all(chunk.map(async (update) => {
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
    }));
  }
}

async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  const seeds = await loadAllSeeds();
  const observations = await loadFreshObservations();
  const now = new Date();
  const previous = new Map(seeds.map((seed) => [seed.canonical_url, seed.freshness_status]));
  const seedInputs: SeedForMatching[] = seeds.map(({ canonical_url, source_domain }) => ({ canonical_url, source_domain }));
  const results = matchSeedsToFreshObservations(seedInputs, observations, now);
  const updates = computeFreshnessUpdateBatch(seedInputs, observations, previous, now);
  const summary = summarizeFreshnessResults(results);

  if (!apply) {
    console.log(JSON.stringify({
      ok: true,
      status: "DRY_RUN",
      ...summary,
      accepted_fresh_observations: observations.length,
      changed_rows: updates.length,
    }, null, 2));
    return;
  }

  if (!isOpenSerpIngestionCronAuthorized()) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_FLAGS_DISABLED", ...summary, changed_rows: updates.length }, null, 2));
    return;
  }

  await applyUpdates(updates);
  console.log(JSON.stringify({
    ok: true,
    status: "APPLIED",
    ...summary,
    accepted_fresh_observations: observations.length,
    changed_rows: updates.length,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
