// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — domain service layer.
// This is the single choke point mission section 10 ("comment evite-t-on les
// faux merges") relies on: assignSourceOfferToCluster() refuses every path
// except the four explicitly authorized origin types, and refuses to grow a
// cluster past one member unless MARKET_INDEX_CLUSTERING_ENABLED is true
// (which it never is in this mission) AND the origin is one of the two
// human/explicit-identifier origins.

import { computeContentFingerprint, computeObservedAtBucket } from "./market-index-identifiers";
import { isMarketIndexClusteringEnabled } from "./market-index-feature-flags";
import type {
  ObservationRepository,
  PropertyClusterRepository,
} from "./market-index-repository";
import type { ClusterOrigin, Observation, PropertyCluster, PropertyClusterMember } from "./market-index-types";
import { ALLOWED_CLUSTER_ORIGINS } from "./market-index-types";

export class AutomaticClusteringRefusedError extends Error {
  constructor(reason: string) {
    super(`Automatic clustering refused: ${reason}`);
    this.name = "AutomaticClusteringRefusedError";
  }
}

// Origins that MAY grow a cluster beyond its first member. Deterministic
// same-source and legacy projection are single-member-only by construction
// (see the multi-member guard below) -- only an explicit human/partner
// identifier can knowingly attach a second SourceOffer to an existing cluster.
const MULTI_MEMBER_CAPABLE_ORIGINS: readonly ClusterOrigin[] = ["manual_review", "explicit_partner_identifier"];

export async function getOrCreateLegacyProjectionCluster(
  repo: PropertyClusterRepository,
  legacyPropertyListingId: number,
): Promise<PropertyCluster> {
  const existing = await repo.findByLegacyPropertyListingId(legacyPropertyListingId);
  if (existing) return existing;
  return repo.create({
    cluster_origin: "legacy_one_to_one_projection",
    legacy_property_listing_id: legacyPropertyListingId,
    created_by: "legacy-adapter",
    notes: "Auto-created 1:1 projection of a pre-existing property_listings row -- never merges.",
  });
}

export async function assignSourceOfferToCluster(
  repo: PropertyClusterRepository,
  input: {
    propertyClusterId: string;
    sourceOfferId: number;
    originType: ClusterOrigin;
    addedBy?: string;
  },
): Promise<PropertyClusterMember> {
  if (!ALLOWED_CLUSTER_ORIGINS.includes(input.originType)) {
    throw new AutomaticClusteringRefusedError(`origin_type "${input.originType}" is not one of the allowed cluster origins`);
  }

  const existingMembers = await repo.getMembers(input.propertyClusterId);

  if (existingMembers.length === 0) {
    // First member of a cluster is always allowed -- this is not "clustering
    // two things together", it's attaching the cluster's sole source offer.
    return repo.addMember({
      property_cluster_id: input.propertyClusterId,
      source_offer_id: input.sourceOfferId,
      origin_type: input.originType,
      added_by: input.addedBy ?? null,
    });
  }

  // Adding a SECOND (or later) member is real clustering -- the one place
  // this mission structurally forbids automatic behavior.
  if (!isMarketIndexClusteringEnabled()) {
    throw new AutomaticClusteringRefusedError(
      "MARKET_INDEX_CLUSTERING_ENABLED is false -- multi-source clustering is disabled by default and was not enabled for this call.",
    );
  }
  if (!MULTI_MEMBER_CAPABLE_ORIGINS.includes(input.originType)) {
    throw new AutomaticClusteringRefusedError(
      `origin_type "${input.originType}" cannot add a second member to an existing cluster -- ` +
        `only manual_review or explicit_partner_identifier may do so, and only when clustering is explicitly enabled.`,
    );
  }

  return repo.addMember({
    property_cluster_id: input.propertyClusterId,
    source_offer_id: input.sourceOfferId,
    origin_type: input.originType,
    added_by: input.addedBy ?? null,
  });
}

export async function recordObservationIfChanged(
  repo: ObservationRepository,
  input: {
    sourceOfferId: number;
    observedAtIso: string;
    displayedPrice: number | null;
    currency: string | null;
    surfaceM2: number | null;
    titleFingerprint: string | null;
    title: string | null;
    description: string | null;
    sourceStatus: string | null;
    availabilityClaim: string | null;
    observationOrigin: string;
    ingestionRunId: string | null;
  },
): Promise<{ created: boolean; observation: Observation }> {
  const contentFingerprint = computeContentFingerprint(input.title, input.description);
  const bucket = computeObservedAtBucket(input.observedAtIso);

  const existing = await repo.findByIdempotencyKey(input.sourceOfferId, bucket, contentFingerprint);
  if (existing) {
    return { created: false, observation: existing };
  }

  const observation = await repo.create({
    source_offer_id: input.sourceOfferId,
    observed_at: input.observedAtIso,
    displayed_price: input.displayedPrice,
    currency: input.currency,
    surface_m2: input.surfaceM2,
    title_fingerprint: input.titleFingerprint,
    content_fingerprint: contentFingerprint,
    source_status: input.sourceStatus,
    availability_claim: input.availabilityClaim,
    observation_origin: input.observationOrigin,
    ingestion_run_id: input.ingestionRunId,
  });

  return { created: true, observation };
}
