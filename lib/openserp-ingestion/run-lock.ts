// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 20 (overlap guard).
// No new table is created for this (no migration is needed for the mission
// to work at all — every other write already targets existing tables). A
// single, clearly-namespaced sentinel row in the already-existing
// discovery_candidates table gives an atomic compare-and-set lock for free,
// via that table's own (provider, query_hash, canonical_url) unique index:
// a plain INSERT (not upsert) either succeeds (lock acquired) or fails on
// conflict (another run holds it). provider="openserp-ingestion-lock" is
// reserved and never used by real discovery data (real rows always use
// provider="openserp"), so this can never be confused with, or diluted by,
// genuine discovery metrics -- callers computing discovery_candidates
// metrics should filter provider="openserp" regardless.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { computeQueryHash } from "@/lib/market-index/market-index-identifiers";

const LOCK_PROVIDER = "openserp-ingestion-lock";
const LOCK_SENTINEL_URL = "internal://openserp-ingestion-run-lock";
const LOCK_QUERY_HASH = computeQueryHash(LOCK_PROVIDER, "lock");
// A single run's realistic ceiling (query budget × per-query timeout) is a
// few minutes; 10 minutes gives ample margin before a crashed run's stale
// lock is considered abandoned and stolen by the next scheduled tick.
const LOCK_STALE_MS = 10 * 60 * 1000;

export type RunLockResult = { acquired: true } | { acquired: false; reason: "SKIPPED_OVERLAPPING_RUN" };

export async function acquireIngestionRunLock(runId: string): Promise<RunLockResult> {
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const insertResult = await supabase
    .from("discovery_candidates")
    .insert({
      provider: LOCK_PROVIDER,
      query_hash: LOCK_QUERY_HASH,
      canonical_url: LOCK_SENTINEL_URL,
      source_domain: "internal.akarfinder",
      source_url: LOCK_SENTINEL_URL,
      discovery_status: "discovered",
      discovered_at: nowIso,
      last_seen_at: nowIso,
      metadata: { run_id: runId, locked_at: nowIso },
    })
    .select("id");

  if (!insertResult.error) return { acquired: true };

  // Insert failed -- almost certainly the unique-index conflict from an
  // active (or crashed) prior lock. Check staleness before giving up.
  const existing = await supabase
    .from("discovery_candidates")
    .select("id, metadata, updated_at")
    .eq("provider", LOCK_PROVIDER)
    .eq("canonical_url", LOCK_SENTINEL_URL)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return { acquired: false, reason: "SKIPPED_OVERLAPPING_RUN" };
  }

  const lockedAt = new Date((existing.data.metadata as { locked_at?: string } | null)?.locked_at ?? existing.data.updated_at);
  const isStale = Date.now() - lockedAt.getTime() > LOCK_STALE_MS;
  if (!isStale) {
    return { acquired: false, reason: "SKIPPED_OVERLAPPING_RUN" };
  }

  const stealResult = await supabase
    .from("discovery_candidates")
    .update({ metadata: { run_id: runId, locked_at: nowIso, stole_from_stale_lock: true }, last_seen_at: nowIso })
    .eq("id", existing.data.id);
  if (stealResult.error) {
    return { acquired: false, reason: "SKIPPED_OVERLAPPING_RUN" };
  }
  return { acquired: true };
}

export async function releaseIngestionRunLock(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.from("discovery_candidates").delete().eq("provider", LOCK_PROVIDER).eq("canonical_url", LOCK_SENTINEL_URL);
}
