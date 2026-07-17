// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1 — read-only repository for
// verified, strictly 1:1 Market Index clusters. Never writes. Never used to
// resolve ambiguity (multi-source listings are never looked up here — the
// service layer excludes them before calling in).

export type VerifiedClusterLookup = {
  legacyPropertyListingId: number;
  clusterId: string;
  clusterOrigin: string;
  sourceOfferIds: number[]; // all listing_sources ids currently attached to this cluster
};

export interface MarketIndexReadRepository {
  // Batched: given a list of property_listings.id values, return the
  // verified cluster (if any) for each. A listing absent from the result
  // has no cluster at all -- the caller must fall back to legacy.
  findVerifiedClustersByLegacyListingIds(
    legacyPropertyListingIds: number[],
  ): Promise<Map<number, VerifiedClusterLookup>>;
}

// ---------------------------------------------------------------------------
// Supabase-backed implementation. Server-only (uses the service-role client,
// same mechanism already reading property_listings/listing_sources today --
// no new RLS policy, RPC, or view required, per the section 8 gate).
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabaseMarketIndexReadRepository implements MarketIndexReadRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findVerifiedClustersByLegacyListingIds(
    legacyPropertyListingIds: number[],
  ): Promise<Map<number, VerifiedClusterLookup>> {
    const result = new Map<number, VerifiedClusterLookup>();
    if (legacyPropertyListingIds.length === 0) return result;

    const { data: clusters, error: clusterError } = await this.client
      .from("property_clusters")
      .select("id, cluster_origin, legacy_property_listing_id")
      .in("legacy_property_listing_id", legacyPropertyListingIds)
      .eq("cluster_origin", "legacy_one_to_one_projection");

    if (clusterError || !clusters || clusters.length === 0) return result;

    const clusterIds = clusters.map((c) => c.id as string);
    const { data: members, error: memberError } = await this.client
      .from("property_cluster_members")
      .select("property_cluster_id, source_offer_id")
      .in("property_cluster_id", clusterIds);

    if (memberError || !members) return result;

    const membersByCluster = new Map<string, number[]>();
    for (const m of members) {
      const arr = membersByCluster.get(m.property_cluster_id as string) ?? [];
      arr.push(m.source_offer_id as number);
      membersByCluster.set(m.property_cluster_id as string, arr);
    }

    for (const cluster of clusters) {
      const legacyId = cluster.legacy_property_listing_id as number | null;
      if (legacyId == null) continue;
      const sourceOfferIds = membersByCluster.get(cluster.id as string) ?? [];
      result.set(legacyId, {
        legacyPropertyListingId: legacyId,
        clusterId: cluster.id as string,
        clusterOrigin: cluster.cluster_origin as string,
        sourceOfferIds,
      });
    }

    return result;
  }
}
