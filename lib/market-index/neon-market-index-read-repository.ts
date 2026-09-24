// Read-only Market Index repository backed by Neon/PostgreSQL.
import type {
  MarketIndexReadRepository,
  VerifiedClusterLookup,
} from "./market-index-read-repository";
import type { NeonQueryExecutor } from "@/lib/db/neon-client";

type ClusterRow = {
  id: string;
  cluster_origin: string;
  legacy_property_listing_id: string | number;
};

type MemberRow = {
  property_cluster_id: string;
  source_offer_id: string | number;
};

export class NeonMarketIndexReadRepository
  implements MarketIndexReadRepository
{
  constructor(private readonly executor: NeonQueryExecutor) {}

  async findVerifiedClustersByLegacyListingIds(
    legacyPropertyListingIds: number[],
  ): Promise<Map<number, VerifiedClusterLookup>> {
    const result = new Map<number, VerifiedClusterLookup>();
    if (legacyPropertyListingIds.length === 0) return result;

    const clusters = await this.executor.query<ClusterRow>(
      `SELECT
         id::text AS id,
         cluster_origin,
         legacy_property_listing_id
       FROM property_clusters
       WHERE legacy_property_listing_id = ANY($1::bigint[])
         AND cluster_origin = 'legacy_one_to_one_projection'`,
      [legacyPropertyListingIds],
    );

    if (clusters.length === 0) return result;

    const clusterIds = clusters.map((cluster) => cluster.id);
    const members = await this.executor.query<MemberRow>(
      `SELECT
         property_cluster_id::text AS property_cluster_id,
         source_offer_id
       FROM property_cluster_members
       WHERE property_cluster_id = ANY($1::uuid[])`,
      [clusterIds],
    );

    const membersByCluster = new Map<string, number[]>();
    for (const member of members) {
      const sourceOfferId = Number(member.source_offer_id);
      if (!Number.isSafeInteger(sourceOfferId)) continue;
      const values = membersByCluster.get(member.property_cluster_id) ?? [];
      values.push(sourceOfferId);
      membersByCluster.set(member.property_cluster_id, values);
    }

    for (const cluster of clusters) {
      const legacyId = Number(cluster.legacy_property_listing_id);
      if (!Number.isSafeInteger(legacyId)) continue;

      result.set(legacyId, {
        legacyPropertyListingId: legacyId,
        clusterId: cluster.id,
        clusterOrigin: cluster.cluster_origin,
        sourceOfferIds: membersByCluster.get(cluster.id) ?? [],
      });
    }

    return result;
  }
}
