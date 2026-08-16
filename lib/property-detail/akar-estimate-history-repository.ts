import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildObservedPriceHistory,
  type PriceHistoryModel,
  type PriceObservation,
} from "@/lib/property-detail/akar-estimate-history";

const VERIFIED_CLUSTER_ORIGINS = [
  "manual_review",
  "explicit_partner_identifier",
  "deterministic_same_source_identifier",
  "legacy_one_to_one_projection",
] as const;

const MAX_HISTORY_OBSERVATIONS = 2_000;

type ClusterRow = {
  id: string;
  cluster_origin: string;
};

type ClusterMemberRow = {
  property_cluster_id: string;
  source_offer_id: number;
};

type SourceOfferRow = {
  id: number;
  source_name: string | null;
};

type ObservationRow = {
  source_offer_id: number;
  observed_at: string;
  displayed_price: number | null;
};

export function assembleObservedPriceHistory(input: {
  members: ClusterMemberRow[];
  sources: SourceOfferRow[];
  observations: ObservationRow[];
}): PriceHistoryModel {
  const allowedSourceOfferIds = new Set(input.members.map((row) => row.source_offer_id));
  const sourceNameById = new Map(
    input.sources.map((row) => [row.id, row.source_name?.trim() || ""]),
  );

  const qualified: PriceObservation[] = input.observations.flatMap((row) => {
    if (!allowedSourceOfferIds.has(row.source_offer_id)) return [];
    const sourceName = sourceNameById.get(row.source_offer_id) ?? "";
    if (row.displayed_price == null) return [];
    return [{
      observedAt: row.observed_at,
      displayedPriceMad: row.displayed_price,
      sourceOfferId: row.source_offer_id,
      sourceName,
    }];
  });

  return buildObservedPriceHistory(qualified);
}

export class SupabaseObservedPriceHistoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findForListingId(publicListingId: string): Promise<PriceHistoryModel> {
    const listingId = Number(publicListingId);
    if (!Number.isSafeInteger(listingId) || listingId <= 0) {
      return buildObservedPriceHistory([]);
    }

    const { data: clusterData, error: clusterError } = await this.client
      .from("property_clusters")
      .select("id, cluster_origin")
      .eq("legacy_property_listing_id", listingId)
      .in("cluster_origin", [...VERIFIED_CLUSTER_ORIGINS]);
    if (clusterError) throw new Error(`ANN-L9 history cluster read failed: ${clusterError.message}`);
    const clusters = (clusterData ?? []) as ClusterRow[];
    if (clusters.length === 0) return buildObservedPriceHistory([]);

    const clusterIds = clusters.map((row) => row.id);
    const { data: memberData, error: memberError } = await this.client
      .from("property_cluster_members")
      .select("property_cluster_id, source_offer_id")
      .in("property_cluster_id", clusterIds);
    if (memberError) throw new Error(`ANN-L9 history member read failed: ${memberError.message}`);
    const members = (memberData ?? []) as ClusterMemberRow[];
    if (members.length === 0) return buildObservedPriceHistory([]);

    const sourceOfferIds = [...new Set(members.map((row) => row.source_offer_id))];
    const [{ data: sourceData, error: sourceError }, { data: observationData, error: observationError }] = await Promise.all([
      this.client
        .from("listing_sources")
        .select("id, source_name")
        .in("id", sourceOfferIds),
      this.client
        .from("source_offer_observations")
        .select("source_offer_id, observed_at, displayed_price")
        .in("source_offer_id", sourceOfferIds)
        .order("observed_at", { ascending: true })
        .limit(MAX_HISTORY_OBSERVATIONS),
    ]);
    if (sourceError) throw new Error(`ANN-L9 history attribution read failed: ${sourceError.message}`);
    if (observationError) throw new Error(`ANN-L9 history observation read failed: ${observationError.message}`);

    return assembleObservedPriceHistory({
      members,
      sources: (sourceData ?? []) as SourceOfferRow[],
      observations: (observationData ?? []) as ObservationRow[],
    });
  }
}
