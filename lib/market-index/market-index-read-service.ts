// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1 — orchestrates the repository +
// adapter for a batch of listings. Internal metrics only (never returned in
// an HTTP response body -- callers log them server-side, per the parity
// contract's "never expose internal metrics" rule).

import type { MarketIndexReadRepository } from "./market-index-read-repository";
import { resolveSourcePick, type ReadCandidateSource, type SourcePickOutcome } from "./market-index-read-adapter";

export type MarketIndexReadMetrics = {
  market_index_rows_used: number;
  legacy_fallback_rows: number;
  invalid_cluster_rows: number; // legacy_no_cluster + legacy_membership_mismatch
  missing_membership_rows: number; // legacy_multi_membership (cluster exists, wrong membership count)
  multi_membership_clusters: number; // same signal, named per the ODM's own metric list
  parity_mismatch_count: number; // reserved for the shadow-read comparator, always 0 from this service alone
};

export type BatchSourceResolution = {
  picks: Map<number, SourcePickOutcome>;
  metrics: MarketIndexReadMetrics;
};

function emptyMetrics(): MarketIndexReadMetrics {
  return {
    market_index_rows_used: 0,
    legacy_fallback_rows: 0,
    invalid_cluster_rows: 0,
    missing_membership_rows: 0,
    multi_membership_clusters: 0,
    parity_mismatch_count: 0,
  };
}

export async function resolveSourcesForListings(
  repository: MarketIndexReadRepository,
  listings: Array<{ id: number; sources: ReadCandidateSource[] }>,
): Promise<BatchSourceResolution> {
  const metrics = emptyMetrics();
  const picks = new Map<number, SourcePickOutcome>();

  // Only listings that could possibly be eligible (single source, explicit
  // provenance) are worth a cluster lookup -- everything else is decided
  // without any Market Index query at all.
  const candidateIds = listings
    .filter((l) => l.sources.length === 1 && l.sources[0].origin_type === "persisted_openserp")
    .map((l) => l.id);

  const verifiedClusters =
    candidateIds.length > 0
      ? await repository.findVerifiedClustersByLegacyListingIds(candidateIds)
      : new Map();

  for (const listing of listings) {
    const outcome = resolveSourcePick(listing.id, listing.sources, verifiedClusters.get(listing.id));
    picks.set(listing.id, outcome);

    if (outcome.usedMarketIndex) {
      metrics.market_index_rows_used++;
    } else {
      metrics.legacy_fallback_rows++;
      if (outcome.reason === "legacy_no_cluster" || outcome.reason === "legacy_membership_mismatch") {
        metrics.invalid_cluster_rows++;
      }
      if (outcome.reason === "legacy_multi_membership") {
        metrics.missing_membership_rows++;
        metrics.multi_membership_clusters++;
      }
    }
  }

  return { picks, metrics };
}

export function logMarketIndexReadMetrics(metrics: MarketIndexReadMetrics): void {
  // Server-side log only -- never returned to a client, per the parity
  // contract. Deliberately a single structured line for easy grepping in
  // Vercel Functions logs without exposing anything publicly.
  console.log(`[market-index-read] ${JSON.stringify(metrics)}`);
}
