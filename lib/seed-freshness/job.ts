// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#5/10) -- idempotent freshness
// refresh job. Pure batch-computation logic, separated from the Supabase IO
// wrapper (scripts/openserp/seed-freshness-job.ts) so it is independently
// testable without a live DB connection. This job only ever UPDATEs existing
// source_offer_seeds rows' freshness fields -- it never inserts a row (that
// is the harvester's job) and never touches any public-facing table.

import { matchSeedsToFreshObservations, type FreshDiscoveryObservation, type SeedForMatching, type SeedFreshnessResult } from "./matcher.js";

export type SeedFreshnessUpdate = {
  canonical_url: string;
  freshness_status: SeedFreshnessResult["freshness_status"];
  fresh_last_seen_at: string | null;
  fresh_channels: string[];
  updated_at: string;
};

// Idempotent: computing this batch twice from the same inputs (same seeds,
// same fresh observations, same `now`) yields byte-identical output. Only
// rows whose freshness_status actually changes are included -- re-running
// the job with no new fresh observations produces an empty batch, not a
// no-op UPDATE storm.
export function computeFreshnessUpdateBatch(
  seeds: SeedForMatching[],
  freshObservations: FreshDiscoveryObservation[],
  previousStatusByUrl: Map<string, SeedFreshnessResult["freshness_status"]>,
  now: Date = new Date(),
): SeedFreshnessUpdate[] {
  const results = matchSeedsToFreshObservations(seeds, freshObservations, now);
  const nowIso = now.toISOString();

  const changed: SeedFreshnessUpdate[] = [];
  for (const r of results) {
    const previous = previousStatusByUrl.get(r.canonical_url);
    if (previous === r.freshness_status) continue; // no-op, skip
    changed.push({
      canonical_url: r.canonical_url,
      freshness_status: r.freshness_status,
      fresh_last_seen_at: r.fresh_last_seen_at,
      fresh_channels: r.fresh_channels,
      updated_at: nowIso,
    });
  }
  return changed;
}
