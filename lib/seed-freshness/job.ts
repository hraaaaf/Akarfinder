// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#5/10) -- idempotent freshness
// refresh job. Pure batch-computation logic, separated from the Supabase IO
// wrapper (scripts/openserp/seed-freshness-job.ts) so it is independently
// testable without a live DB connection. This job only ever UPDATEs existing
// source_offer_seeds rows' freshness fields -- it never inserts a row (that
// is the harvester's job) and never touches any public-facing table.

import { matchSeedsToFreshObservations, type FreshDiscoveryObservation, type FreshnessStatus, type SeedForMatching, type SeedFreshnessResult } from "./matcher.js";

export const OPENSERP_FRESHNESS_CHANNEL = "openserp_yandex_discovery";

export type SeedFreshnessUpdate = {
  canonical_url: string;
  freshness_status: SeedFreshnessResult["freshness_status"];
  fresh_last_seen_at: string | null;
  fresh_channels: string[];
  updated_at: string;
};

export type ExistingSeedFreshnessState = {
  freshness_status: FreshnessStatus;
  fresh_last_seen_at: string | null;
  fresh_channels: string[];
};

// Historical single-channel contract. Kept stable for existing consumers and
// tests. The production OpenSERP reconciler uses the channel-owned variant
// below so it cannot erase evidence owned by another freshness channel.
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
    if (previous === r.freshness_status) continue;
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

const STATUS_RANK: Record<FreshnessStatus, number> = {
  seed_only: 0,
  stale: 1,
  aging: 2,
  fresh_confirmed: 3,
};

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function sameChannels(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

/**
 * Multi-channel ownership contract for the OpenSERP/Yandex reconciler.
 *
 * OpenSERP owns only `openserp_yandex_discovery`. If another channel is already
 * present, an absent/aging/stale OpenSERP observation MUST NOT downgrade that
 * other channel's state or erase its channel. A fresh OpenSERP observation may
 * be added alongside the foreign channel; status and last-seen are merged using
 * the freshest/strongest evidence already present.
 *
 * Expiry of a foreign channel belongs to that channel's own lifecycle job. This
 * function intentionally does not guess another channel's TTL.
 */
export function computeChannelOwnedFreshnessUpdateBatch(
  seeds: SeedForMatching[],
  freshObservations: FreshDiscoveryObservation[],
  existingByUrl: Map<string, ExistingSeedFreshnessState>,
  now: Date = new Date(),
): SeedFreshnessUpdate[] {
  const results = matchSeedsToFreshObservations(seeds, freshObservations, now);
  const nowIso = now.toISOString();
  const updates: SeedFreshnessUpdate[] = [];

  for (const result of results) {
    const existing = existingByUrl.get(result.canonical_url) ?? {
      freshness_status: "seed_only" as const,
      fresh_last_seen_at: null,
      fresh_channels: [],
    };
    const foreignChannels = existing.fresh_channels.filter((channel) => channel !== OPENSERP_FRESHNESS_CHANNEL);
    const openSerpObserved = result.fresh_channels.includes(OPENSERP_FRESHNESS_CHANNEL);

    let proposedStatus = result.freshness_status;
    let proposedLastSeen = result.fresh_last_seen_at;
    let proposedChannels = [...result.fresh_channels];

    if (foreignChannels.length > 0) {
      if (!openSerpObserved) {
        // This writer has no current evidence of its own. It does not own the
        // foreign channel, therefore it has nothing to update.
        continue;
      }
      proposedChannels = [...new Set([...foreignChannels, ...existing.fresh_channels, OPENSERP_FRESHNESS_CHANNEL])].sort();
      proposedStatus = STATUS_RANK[existing.freshness_status] >= STATUS_RANK[result.freshness_status]
        ? existing.freshness_status
        : result.freshness_status;
      proposedLastSeen = maxIso(existing.fresh_last_seen_at, result.fresh_last_seen_at);
    }

    const unchanged = existing.freshness_status === proposedStatus
      && existing.fresh_last_seen_at === proposedLastSeen
      && sameChannels(existing.fresh_channels, proposedChannels);
    if (unchanged) continue;

    updates.push({
      canonical_url: result.canonical_url,
      freshness_status: proposedStatus,
      fresh_last_seen_at: proposedLastSeen,
      fresh_channels: proposedChannels,
      updated_at: nowIso,
    });
  }

  return updates;
}
