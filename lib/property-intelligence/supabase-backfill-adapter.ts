import type { SupabaseClient } from "@supabase/supabase-js";
import type { BackfillDependencies, BackfillListing, BackfillPage } from "./backfill";
import { PropertyIntelligenceStore } from "./store";

type ClusterRow = {
  id: string;
  legacy_property_listing_id: number;
};

type ListingRow = {
  id: number;
  title: string | null;
  description_snippet: string | null;
  reliability_score: number | null;
  condition: string | null;
  property_age_range: string | null;
  orientation: string | null;
  has_pool: boolean | null;
  has_concierge: boolean | null;
  garage_spaces: number | null;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function mapClusterListingToBackfillListing(cluster: ClusterRow, listing: ListingRow): BackfillListing {
  if (cluster.legacy_property_listing_id !== listing.id) throw new Error("cluster_listing_mismatch");
  return {
    cursor: cluster.id,
    canonicalPropertyId: cluster.id,
    title: listing.title,
    description: listing.description_snippet,
    sourceReliability: listing.reliability_score == null ? undefined : clamp01(listing.reliability_score / 100),
    structured: {
      condition: listing.condition,
      property_age_range: listing.property_age_range,
      orientation: listing.orientation,
      has_pool: listing.has_pool,
      has_concierge: listing.has_concierge,
      has_parking: listing.garage_spaces == null ? undefined : listing.garage_spaces > 0,
    },
    sourceObservationIds: [],
  };
}

export function createSupabaseBackfillDependencies(
  client: SupabaseClient,
  store: PropertyIntelligenceStore,
): BackfillDependencies {
  return {
    async fetchPage(cursor: string | null, limit: number): Promise<BackfillPage> {
      let clusterQuery = client
        .from("property_clusters")
        .select("id,legacy_property_listing_id")
        .not("legacy_property_listing_id", "is", null)
        .order("id", { ascending: true })
        .limit(limit);
      if (cursor) clusterQuery = clusterQuery.gt("id", cursor);

      const { data: clusterData, error: clusterError } = await clusterQuery;
      if (clusterError) throw new Error(`property_intelligence_backfill_clusters_failed:${clusterError.message}`);
      const clusters = (clusterData ?? []) as ClusterRow[];
      if (clusters.length === 0) return { rows: [], nextCursor: null };

      const listingIds = clusters.map((cluster) => cluster.legacy_property_listing_id);
      const { data: listingData, error: listingError } = await client
        .from("property_listings")
        .select("id,title,description_snippet,reliability_score,condition,property_age_range,orientation,has_pool,has_concierge,garage_spaces")
        .in("id", listingIds);
      if (listingError) throw new Error(`property_intelligence_backfill_listings_failed:${listingError.message}`);

      const byId = new Map(((listingData ?? []) as ListingRow[]).map((listing) => [listing.id, listing]));
      const rows = clusters.map((cluster) => {
        const listing = byId.get(cluster.legacy_property_listing_id);
        if (!listing) throw new Error(`property_intelligence_backfill_listing_missing:${cluster.legacy_property_listing_id}`);
        return mapClusterListingToBackfillListing(cluster, listing);
      });

      return {
        rows,
        nextCursor: clusters.length === limit ? clusters.at(-1)?.id ?? null : null,
      };
    },
    async persistFeature(input): Promise<void> {
      await store.persistFeature(input);
    },
  };
}
