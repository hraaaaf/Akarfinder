import type { SupabaseClient } from "@supabase/supabase-js";
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

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function comparablePropertyTypeForDb(value: string): string | null {
  switch (normalized(value)) {
    case "appartement":
    case "apartment":
      return "apartment";
    case "villa":
      return "villa";
    case "terrain":
    case "land":
      return "land";
    case "bureau":
    case "office":
      return "office";
    default:
      return null;
  }
}

export function comparableTransactionForDb(value: MarketComparableTarget["transactionType"]): string {
  if (value === "buy") return "sale";
  return value;
}

function publicPropertyType(value: string | null): string {
  switch (normalized(value)) {
    case "apartment": return "Appartement";
    case "villa": return "Villa";
    case "land": return "Terrain";
    case "office": return "Bureau";
    default: return value?.trim() || "";
  }
}

function publicTransactionType(value: string | null): MarketComparableTarget["transactionType"] | null {
  switch (normalized(value)) {
    case "sale":
    case "buy":
      return "buy";
    case "rent":
      return "rent";
    case "new":
      return "new";
    default:
      return null;
  }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function assembleMarketComparableCandidates(input: {
  listings: CandidateListingRow[];
  clusters: ClusterRow[];
  members: ClusterMemberRow[];
  sources: SourceOfferRow[];
  observations: ObservationRow[];
}): MarketComparableCandidate[] {
  const listingById = new Map(input.listings.map((row) => [row.id, row]));
  const membersByCluster = new Map<string, number[]>();
  for (const member of input.members) {
    const values = membersByCluster.get(member.property_cluster_id) ?? [];
    values.push(member.source_offer_id);
    membersByCluster.set(member.property_cluster_id, values);
  }

  const sourceById = new Map(input.sources.map((source) => [source.id, source.source_name?.trim() || null]));
  const latestObservationBySource = new Map<number, ObservationRow>();
  for (const observation of input.observations) {
    const existing = latestObservationBySource.get(observation.source_offer_id);
    if (!existing || observation.observed_at > existing.observed_at) {
      latestObservationBySource.set(observation.source_offer_id, observation);
    }
  }

  const result: MarketComparableCandidate[] = [];
  for (const cluster of input.clusters) {
    if (!VERIFIED_CLUSTER_ORIGINS.includes(cluster.cluster_origin as typeof VERIFIED_CLUSTER_ORIGINS[number])) continue;
    if (cluster.legacy_property_listing_id == null) continue;
    const listing = listingById.get(cluster.legacy_property_listing_id);
    if (!listing) continue;

    const memberIds = [...new Set(membersByCluster.get(cluster.id) ?? [])];
    if (memberIds.length === 0) continue;
    const observations = memberIds
      .map((id) => latestObservationBySource.get(id))
      .filter((value): value is ObservationRow => value != null)
      .sort((a, b) => b.observed_at.localeCompare(a.observed_at));
    const latest = observations[0];
    if (!latest) continue;

    const attribution = uniqueSorted(memberIds.flatMap((id) => {
      const source = sourceById.get(id);
      return source ? [source] : [];
    }));
    const transaction = publicTransactionType(listing.transaction_type);
    if (!transaction) continue;

    result.push({
      listingId: String(listing.id),
      propertyClusterId: cluster.id,
      clusterVerified: true,
      city: listing.city?.trim() || "",
      neighborhood: listing.district?.trim() || null,
      propertyType: publicPropertyType(listing.property_type),
      transactionType: transaction,
      displayedPriceMad: latest.displayed_price,
      surfaceM2: latest.surface_m2,
      observedAt: latest.observed_at,
      sourceCount: attribution.length,
      sourceAttribution: attribution,
    });
  }

  return result;
}

export class SupabaseMarketComparableCandidateRepository implements MarketComparableCandidateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findCandidates(target: MarketComparableTarget): Promise<MarketComparableCandidate[]> {
    const propertyType = comparablePropertyTypeForDb(target.propertyType);
    if (!propertyType) return [];
    const transactionType = comparableTransactionForDb(target.transactionType);

    let query = this.client
      .from("property_listings")
      .select("id, city, district, property_type, transaction_type")
      .eq("city", target.city)
      .eq("property_type", propertyType)
      .eq("transaction_type", transactionType)
      .order("updated_at", { ascending: false })
      .limit(MAX_CANDIDATE_LISTINGS);

    const numericTargetId = Number(target.listingId);
    if (Number.isSafeInteger(numericTargetId) && numericTargetId > 0) {
      query = query.neq("id", numericTargetId);
    }

    const { data: listingData, error: listingError } = await query;
    if (listingError) throw new Error(`ANN-L8 candidate listing read failed: ${listingError.message}`);
    const listings = (listingData ?? []) as CandidateListingRow[];
    if (listings.length === 0) return [];

    const listingIds = listings.map((row) => row.id);
    const { data: clusterData, error: clusterError } = await this.client
      .from("property_clusters")
      .select("id, cluster_origin, legacy_property_listing_id")
      .in("legacy_property_listing_id", listingIds)
      .in("cluster_origin", [...VERIFIED_CLUSTER_ORIGINS]);
    if (clusterError) throw new Error(`ANN-L8 cluster read failed: ${clusterError.message}`);
    const clusters = (clusterData ?? []) as ClusterRow[];
    if (clusters.length === 0) return [];

    const clusterIds = clusters.map((row) => row.id);
    const { data: memberData, error: memberError } = await this.client
      .from("property_cluster_members")
      .select("property_cluster_id, source_offer_id")
      .in("property_cluster_id", clusterIds);
    if (memberError) throw new Error(`ANN-L8 cluster member read failed: ${memberError.message}`);
    const members = (memberData ?? []) as ClusterMemberRow[];
    if (members.length === 0) return [];

    const sourceOfferIds = [...new Set(members.map((row) => row.source_offer_id))];
    const [{ data: sourceData, error: sourceError }, { data: observationData, error: observationError }] = await Promise.all([
      this.client
        .from("listing_sources")
        .select("id, source_name")
        .in("id", sourceOfferIds),
      this.client
        .from("source_offer_observations")
        .select("source_offer_id, observed_at, displayed_price, surface_m2")
        .in("source_offer_id", sourceOfferIds)
        .order("observed_at", { ascending: false })
        .limit(MAX_OBSERVATION_ROWS),
    ]);
    if (sourceError) throw new Error(`ANN-L8 source attribution read failed: ${sourceError.message}`);
    if (observationError) throw new Error(`ANN-L8 observation read failed: ${observationError.message}`);

    return assembleMarketComparableCandidates({
      listings,
      clusters,
      members,
      sources: (sourceData ?? []) as SourceOfferRow[],
      observations: (observationData ?? []) as ObservationRow[],
    });
  }
}
