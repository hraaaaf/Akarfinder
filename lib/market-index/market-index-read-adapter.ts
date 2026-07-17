// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1 - pure decision logic (no I/O).
// Given a listing's already-fetched sources and (if any) its verified
// cluster lookup, decide: use the Market-Index-verified source, or fall back
// to the exact pre-existing legacy heuristic. Never invents a value, never
// resolves ambiguity, never touches duplicate_group_id (not even in scope
// here -- this module doesn't receive it).

import type { VerifiedClusterLookup } from "./market-index-read-repository";

export type ReadCandidateSource = {
  id: number;
  source_name: string | null;
  listing_url: string | null;
  source_url: string | null;
  is_active: boolean;
  origin_type: string | null;
};

export type SourcePickReason =
  "market_index_verified" |
  "legacy_multi_source" |
  "legacy_no_provenance" |
  "legacy_no_cluster" |
  "legacy_multi_membership" |
  "legacy_membership_mismatch" |
  "legacy_no_sources";

export type SourcePickOutcome = {
  source: ReadCandidateSource | null;
  usedMarketIndex: boolean;
  reason: SourcePickReason;
};

// Byte-identical to the pre-existing heuristic in lib/db/supabase-listings.ts.
// Kept here too so the two are provably the same function, not just assumed
// to agree -- both call sites now import this one implementation.
export function legacyActiveSourcePick(sources: ReadCandidateSource[]): ReadCandidateSource | null {
  const active = sources.find((s) => s.is_active);
  if (active) return active;
  if (sources.length > 0) return sources[0];
  return null;
}

export function resolveSourcePick(
  legacyPropertyListingId: number,
  sources: ReadCandidateSource[],
  verifiedCluster: VerifiedClusterLookup | undefined,
): SourcePickOutcome {
  void legacyPropertyListingId;

  if (sources.length === 0) {
    return { source: null, usedMarketIndex: false, reason: "legacy_no_sources" };
  }

  if (sources.length > 1) {
    // Ambiguous multi-source listing -- never eligible, per the backfill's
    // own eligibility rule. Always legacy, regardless of any cluster data.
    return { source: legacyActiveSourcePick(sources), usedMarketIndex: false, reason: "legacy_multi_source" };
  }

  const onlySource = sources[0];

  if (onlySource.origin_type !== "persisted_openserp") {
    return { source: onlySource, usedMarketIndex: false, reason: "legacy_no_provenance" };
  }

  if (!verifiedCluster) {
    // Enriched at backfill time but no cluster found now -- legacy data or
    // Market Index data drifted since the backfill snapshot. Never trust a
    // partial state; fall back and let the discrepancy show up in metrics.
    return { source: onlySource, usedMarketIndex: false, reason: "legacy_no_cluster" };
  }

  if (verifiedCluster.sourceOfferIds.length !== 1) {
    // Defensive: this backfill only ever creates 1-membership clusters, but
    // never trust a cluster that isn't exactly 1:1 at read time either.
    return { source: onlySource, usedMarketIndex: false, reason: "legacy_multi_membership" };
  }

  if (verifiedCluster.sourceOfferIds[0] !== onlySource.id) {
    // The cluster's one membership doesn't point back to this listing's own
    // source -- inconsistent state, never trust it.
    return { source: onlySource, usedMarketIndex: false, reason: "legacy_membership_mismatch" };
  }

  // Fully verified: single source, explicit provenance, exactly one
  // membership, pointing back to this exact row. Use it -- note this is
  // mathematically the same row legacyActiveSourcePick() would have picked,
  // since there is only one source to begin with.
  return { source: onlySource, usedMarketIndex: true, reason: "market_index_verified" };
}
