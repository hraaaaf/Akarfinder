// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — repository interfaces.
// No Supabase-backed implementation is wired into any production code path in
// this mission (MARKET_INDEX_WRITE_ENABLED stays false). These interfaces
// exist so the service layer is testable against an in-memory double, and so
// a future activation mission has a clear contract to implement against.

import type {
  DiscoveryCandidate,
  Observation,
  PropertyCluster,
  PropertyClusterMember,
} from "./market-index-types";

export interface DiscoveryCandidateRepository {
  findByIdempotencyKey(provider: string, queryHash: string, canonicalUrl: string): Promise<DiscoveryCandidate | null>;
  create(candidate: Omit<DiscoveryCandidate, "id" | "created_at" | "updated_at">): Promise<DiscoveryCandidate>;
}

export interface PropertyClusterRepository {
  findByLegacyPropertyListingId(legacyId: number): Promise<PropertyCluster | null>;
  create(cluster: Omit<PropertyCluster, "id" | "created_at" | "updated_at">): Promise<PropertyCluster>;
  getMembers(clusterId: string): Promise<PropertyClusterMember[]>;
  addMember(member: Omit<PropertyClusterMember, "id" | "added_at">): Promise<PropertyClusterMember>;
}

// Deliberately NO update()/delete() method -- append-only by interface shape,
// not just by convention. A caller cannot even attempt to mutate an existing
// observation through this contract.
export interface ObservationRepository {
  findLatest(sourceOfferId: number): Promise<Observation | null>;
  findByIdempotencyKey(sourceOfferId: number, observedAtBucket: string, contentFingerprint: string): Promise<Observation | null>;
  create(observation: Omit<Observation, "id" | "created_at">): Promise<Observation>;
}

// ---------------------------------------------------------------------------
// In-memory test doubles. Used by unit tests only -- never imported by
// production code (no Supabase client, no network, no filesystem).
// ---------------------------------------------------------------------------

export class InMemoryDiscoveryCandidateRepository implements DiscoveryCandidateRepository {
  private rows: DiscoveryCandidate[] = [];
  private nextId = 1;

  async findByIdempotencyKey(provider: string, queryHash: string, canonicalUrl: string): Promise<DiscoveryCandidate | null> {
    return (
      this.rows.find(
        (r) => r.provider === provider && r.query_hash === queryHash && r.canonical_url === canonicalUrl,
      ) ?? null
    );
  }

  async create(candidate: Omit<DiscoveryCandidate, "id" | "created_at" | "updated_at">): Promise<DiscoveryCandidate> {
    const now = new Date().toISOString();
    const row: DiscoveryCandidate = { ...candidate, id: String(this.nextId++), created_at: now, updated_at: now };
    this.rows.push(row);
    return row;
  }

  all(): readonly DiscoveryCandidate[] {
    return this.rows;
  }
}

export class InMemoryPropertyClusterRepository implements PropertyClusterRepository {
  private clusters: PropertyCluster[] = [];
  private members: PropertyClusterMember[] = [];
  private nextClusterId = 1;
  private nextMemberId = 1;

  async findByLegacyPropertyListingId(legacyId: number): Promise<PropertyCluster | null> {
    return this.clusters.find((c) => c.legacy_property_listing_id === legacyId) ?? null;
  }

  async create(cluster: Omit<PropertyCluster, "id" | "created_at" | "updated_at">): Promise<PropertyCluster> {
    const now = new Date().toISOString();
    const row: PropertyCluster = { ...cluster, id: `cluster-${this.nextClusterId++}`, created_at: now, updated_at: now };
    this.clusters.push(row);
    return row;
  }

  async getMembers(clusterId: string): Promise<PropertyClusterMember[]> {
    return this.members.filter((m) => m.property_cluster_id === clusterId);
  }

  async addMember(member: Omit<PropertyClusterMember, "id" | "added_at">): Promise<PropertyClusterMember> {
    const row: PropertyClusterMember = { ...member, id: `member-${this.nextMemberId++}`, added_at: new Date().toISOString() };
    this.members.push(row);
    return row;
  }

  allClusters(): readonly PropertyCluster[] {
    return this.clusters;
  }
}

export class InMemoryObservationRepository implements ObservationRepository {
  private rows: Observation[] = [];
  private nextId = 1;

  async findLatest(sourceOfferId: number): Promise<Observation | null> {
    const matches = this.rows.filter((r) => r.source_offer_id === sourceOfferId);
    if (matches.length === 0) return null;
    return matches.reduce((latest, r) => (r.observed_at > latest.observed_at ? r : latest));
  }

  async findByIdempotencyKey(
    sourceOfferId: number,
    observedAtBucket: string,
    contentFingerprint: string,
  ): Promise<Observation | null> {
    return (
      this.rows.find((r) => {
        const bucket = new Date(r.observed_at);
        bucket.setUTCMinutes(0, 0, 0);
        return (
          r.source_offer_id === sourceOfferId &&
          bucket.toISOString() === observedAtBucket &&
          r.content_fingerprint === contentFingerprint
        );
      }) ?? null
    );
  }

  async create(observation: Omit<Observation, "id" | "created_at">): Promise<Observation> {
    const row: Observation = { ...observation, id: `obs-${this.nextId++}`, created_at: new Date().toISOString() };
    this.rows.push(row);
    return row;
  }

  all(): readonly Observation[] {
    return this.rows;
  }
}
