import type { NeonQueryExecutor } from "@/lib/db/neon-client";
import { neonExecutor } from "@/lib/db/neon-client";
import {
  assembleMarketComparableCandidates,
  comparablePropertyTypeForDb,
  comparableTransactionForDb,
} from "@/lib/property-detail/market-comparables-repository";
import type {
  MarketComparableCandidate,
  MarketComparableTarget,
} from "@/lib/property-detail/market-comparables";
import type { MarketComparableCandidateRepository } from "@/lib/property-detail/market-comparables-service";

const MAX_CANDIDATE_LISTINGS = 120;
const MAX_OBSERVATION_ROWS = 1_000;
const VERIFIED_CLUSTER_ORIGINS = [
  "manual_review",
  "explicit_partner_identifier",
  "deterministic_same_source_identifier",
  "legacy_one_to_one_projection",
] as const;

type CandidateListingRow = {
  id: number;
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: string | null;
};

type ClusterRow = {
  id: string;
  cluster_origin: string;
  legacy_property_listing_id: number | null;
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
  surface_m2: number | null;
};

function positiveSafeInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export class NeonMarketComparableCandidateRepository implements MarketComparableCandidateRepository {
  constructor(private readonly executor: NeonQueryExecutor = neonExecutor) {}

  async findCandidates(target: MarketComparableTarget): Promise<MarketComparableCandidate[]> {
    const propertyType = comparablePropertyTypeForDb(target.propertyType);
    if (!propertyType) return [];
    const transactionType = comparableTransactionForDb(target.transactionType);
    const targetId = positiveSafeInteger(target.listingId);

    const listingParams: unknown[] = [
      target.city,
      propertyType,
      transactionType,
      MAX_CANDIDATE_LISTINGS,
    ];
    let excludeTarget = "";
    if (targetId != null) {
      listingParams.push(targetId);
      excludeTarget = `AND id <> $${listingParams.length}`;
    }

    const listings = await this.executor.query<CandidateListingRow>(
      `SELECT id, city, district, property_type, transaction_type
       FROM public.property_listings
       WHERE city = $1
         AND property_type = $2
         AND transaction_type = $3
         ${excludeTarget}
       ORDER BY updated_at DESC
       LIMIT $4`,
      listingParams,
    );
    if (listings.length === 0) return [];

    const listingIds = listings.map((row) => row.id);
    const clusters = await this.executor.query<ClusterRow>(
      `SELECT id, cluster_origin, legacy_property_listing_id
       FROM public.property_clusters
       WHERE legacy_property_listing_id = ANY($1::bigint[])
         AND cluster_origin = ANY($2::text[])`,
      [listingIds, [...VERIFIED_CLUSTER_ORIGINS]],
    );
    if (clusters.length === 0) return [];

    const clusterIds = clusters.map((row) => row.id);
    const members = await this.executor.query<ClusterMemberRow>(
      `SELECT property_cluster_id, source_offer_id
       FROM public.property_cluster_members
       WHERE property_cluster_id = ANY($1::uuid[])`,
      [clusterIds],
    );
    if (members.length === 0) return [];

    const sourceOfferIds = [...new Set(members.map((row) => row.source_offer_id))];
    const [sources, observations] = await Promise.all([
      this.executor.query<SourceOfferRow>(
        `SELECT id, source_name
         FROM public.listing_sources
         WHERE id = ANY($1::bigint[])`,
        [sourceOfferIds],
      ),
      this.executor.query<ObservationRow>(
        `SELECT source_offer_id, observed_at, displayed_price, surface_m2
         FROM public.source_offer_observations
         WHERE source_offer_id = ANY($1::bigint[])
         ORDER BY observed_at DESC
         LIMIT $2`,
        [sourceOfferIds, MAX_OBSERVATION_ROWS],
      ),
    ]);

    return assembleMarketComparableCandidates({
      listings,
      clusters,
      members,
      sources,
      observations,
    });
  }
}
