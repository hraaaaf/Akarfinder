import { neonExecutor, type NeonQueryExecutor } from "@/lib/db/neon-client";
import { assembleObservedPriceHistory } from "@/lib/property-detail/akar-estimate-history-repository";
import { buildObservedPriceHistory, type PriceHistoryModel } from "@/lib/property-detail/akar-estimate-history";

const VERIFIED_CLUSTER_ORIGINS = [
  "manual_review",
  "explicit_partner_identifier",
  "deterministic_same_source_identifier",
  "legacy_one_to_one_projection",
] as const;

const MAX_HISTORY_OBSERVATIONS = 2_000;

type ClusterRow = { id: string; cluster_origin: string };
type ClusterMemberRow = { property_cluster_id: string; source_offer_id: number };
type SourceOfferRow = { id: number; source_name: string | null };
type ObservationRow = { source_offer_id: number; observed_at: string; displayed_price: number | null };

export class NeonObservedPriceHistoryRepository {
  constructor(private readonly executor: NeonQueryExecutor = neonExecutor) {}

  async findForListingId(publicListingId: string): Promise<PriceHistoryModel> {
    const listingId = Number(publicListingId);
    if (!Number.isSafeInteger(listingId) || listingId <= 0) {
      return buildObservedPriceHistory([]);
    }

    const clusters = await this.executor.query<ClusterRow>(
      "SELECT id, cluster_origin FROM public.property_clusters WHERE legacy_property_listing_id = $1 AND cluster_origin = ANY($2::text[])",
      [listingId, [...VERIFIED_CLUSTER_ORIGINS]],
    );
    if (clusters.length === 0) return buildObservedPriceHistory([]);

    const clusterIds = clusters.map((row) => row.id);
    const members = await this.executor.query<ClusterMemberRow>(
      "SELECT property_cluster_id, source_offer_id FROM public.property_cluster_members WHERE property_cluster_id = ANY($1::uuid[])",
      [clusterIds],
    );
    if (members.length === 0) return buildObservedPriceHistory([]);

    const sourceOfferIds = [...new Set(members.map((row) => row.source_offer_id))];
    const [sources, observations] = await Promise.all([
      this.executor.query<SourceOfferRow>(
        "SELECT id, source_name FROM public.listing_sources WHERE id = ANY($1::bigint[])",
        [sourceOfferIds],
      ),
      this.executor.query<ObservationRow>(
        "SELECT source_offer_id, observed_at, displayed_price FROM public.source_offer_observations WHERE source_offer_id = ANY($1::bigint[]) ORDER BY observed_at ASC LIMIT $2",
        [sourceOfferIds, MAX_HISTORY_OBSERVATIONS],
      ),
    ]);

    return assembleObservedPriceHistory({ members, sources, observations });
  }
}