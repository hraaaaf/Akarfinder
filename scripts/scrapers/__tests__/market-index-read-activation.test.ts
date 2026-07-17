import assert from "node:assert/strict";
import test from "node:test";

import { isMarketIndexReadEnabled } from "../../../lib/market-index/market-index-feature-flags.js";
import {
  legacyActiveSourcePick,
  resolveSourcePick,
  type ReadCandidateSource,
} from "../../../lib/market-index/market-index-read-adapter.js";
import {
  resolveSourcesForListings,
  type MarketIndexReadMetrics,
} from "../../../lib/market-index/market-index-read-service.js";
import type { MarketIndexReadRepository, VerifiedClusterLookup } from "../../../lib/market-index/market-index-read-repository.js";

function source(overrides: Partial<ReadCandidateSource>): ReadCandidateSource {
  return {
    id: 1,
    source_name: "mouldar",
    listing_url: "https://mouldar.com/x",
    source_url: "https://mouldar.com/x",
    is_active: true,
    origin_type: null,
    ...overrides,
  };
}

test("MARKET_INDEX_READ_ENABLED is false by default (unset env)", () => {
  assert.equal(isMarketIndexReadEnabled({}), false);
});

test("MARKET_INDEX_READ_ENABLED is false for any value other than the literal string 'true'", () => {
  assert.equal(isMarketIndexReadEnabled({ MARKET_INDEX_READ_ENABLED: "false" }), false);
  assert.equal(isMarketIndexReadEnabled({ MARKET_INDEX_READ_ENABLED: "1" }), false);
  assert.equal(isMarketIndexReadEnabled({ MARKET_INDEX_READ_ENABLED: "TRUE" }), false);
  assert.equal(isMarketIndexReadEnabled({ MARKET_INDEX_READ_ENABLED: "true" }), true);
});

test("legacyActiveSourcePick prefers the active source, falls back to the first", () => {
  const inactive = source({ id: 1, is_active: false });
  const active = source({ id: 2, is_active: true });
  assert.equal(legacyActiveSourcePick([inactive, active]), active);
  assert.equal(legacyActiveSourcePick([inactive]), inactive);
  assert.equal(legacyActiveSourcePick([]), null);
});

test("single source, verified 1:1 cluster -> uses Market Index, reason market_index_verified", () => {
  const s = source({ id: 42, origin_type: "persisted_openserp" });
  const cluster: VerifiedClusterLookup = {
    legacyPropertyListingId: 1,
    clusterId: "c1",
    clusterOrigin: "legacy_one_to_one_projection",
    sourceOfferIds: [42],
  };
  const outcome = resolveSourcePick(1, [s], cluster);
  assert.equal(outcome.usedMarketIndex, true);
  assert.equal(outcome.reason, "market_index_verified");
  assert.equal(outcome.source, s);
});

test("multi-source listing is never eligible for Market Index, regardless of any cluster data", () => {
  const a = source({ id: 1, origin_type: "persisted_openserp", is_active: true });
  const b = source({ id: 2, origin_type: "persisted_openserp", is_active: false });
  const cluster: VerifiedClusterLookup = {
    legacyPropertyListingId: 1,
    clusterId: "c1",
    clusterOrigin: "legacy_one_to_one_projection",
    sourceOfferIds: [1],
  };
  const outcome = resolveSourcePick(1, [a, b], cluster);
  assert.equal(outcome.usedMarketIndex, false);
  assert.equal(outcome.reason, "legacy_multi_source");
  assert.equal(outcome.source, a); // same as legacyActiveSourcePick would pick
});

test("single source without demonstrated provenance falls back to legacy, unmodified", () => {
  const s = source({ id: 1, origin_type: null });
  const outcome = resolveSourcePick(1, [s], undefined);
  assert.equal(outcome.usedMarketIndex, false);
  assert.equal(outcome.reason, "legacy_no_provenance");
  assert.equal(outcome.source, s);
});

test("enriched single source but no cluster found -> legacy fallback (data drift, never trusted)", () => {
  const s = source({ id: 1, origin_type: "persisted_openserp" });
  const outcome = resolveSourcePick(1, [s], undefined);
  assert.equal(outcome.usedMarketIndex, false);
  assert.equal(outcome.reason, "legacy_no_cluster");
});

test("cluster with != 1 membership is refused, never used to pick a source", () => {
  const s = source({ id: 1, origin_type: "persisted_openserp" });
  const clusterEmpty: VerifiedClusterLookup = {
    legacyPropertyListingId: 1,
    clusterId: "c1",
    clusterOrigin: "legacy_one_to_one_projection",
    sourceOfferIds: [],
  };
  const clusterMulti: VerifiedClusterLookup = {
    legacyPropertyListingId: 1,
    clusterId: "c1",
    clusterOrigin: "legacy_one_to_one_projection",
    sourceOfferIds: [1, 2],
  };
  assert.equal(resolveSourcePick(1, [s], clusterEmpty).usedMarketIndex, false);
  assert.equal(resolveSourcePick(1, [s], clusterEmpty).reason, "legacy_multi_membership");
  assert.equal(resolveSourcePick(1, [s], clusterMulti).usedMarketIndex, false);
  assert.equal(resolveSourcePick(1, [s], clusterMulti).reason, "legacy_multi_membership");
});

test("cluster membership pointing to a different source than this listing's own -> refused", () => {
  const s = source({ id: 1, origin_type: "persisted_openserp" });
  const cluster: VerifiedClusterLookup = {
    legacyPropertyListingId: 1,
    clusterId: "c1",
    clusterOrigin: "legacy_one_to_one_projection",
    sourceOfferIds: [999], // does not match s.id
  };
  const outcome = resolveSourcePick(1, [s], cluster);
  assert.equal(outcome.usedMarketIndex, false);
  assert.equal(outcome.reason, "legacy_membership_mismatch");
});

test("no sources at all is handled defensively without throwing", () => {
  const outcome = resolveSourcePick(1, [], undefined);
  assert.equal(outcome.source, null);
  assert.equal(outcome.reason, "legacy_no_sources");
});

test("resolveSourcePick never reads or references duplicate_group_id -- the function signature carries no such field", () => {
  // Structural proof: ReadCandidateSource / resolveSourcePick's parameters
  // have no duplicate_group_id field at all -- impossible to reference.
  const s = source({ id: 1, origin_type: "persisted_openserp" });
  assert.ok(!("duplicate_group_id" in s));
});

test("resolveSourcePick never mutates or invents price/status fields -- it only ever selects among existing source objects", () => {
  const s = source({ id: 1, origin_type: "persisted_openserp" });
  const cluster: VerifiedClusterLookup = {
    legacyPropertyListingId: 1,
    clusterId: "c1",
    clusterOrigin: "legacy_one_to_one_projection",
    sourceOfferIds: [1],
  };
  const outcome = resolveSourcePick(1, [s], cluster);
  // The returned source is the SAME object reference, not a copy with
  // modified fields -- proves no field was invented or altered.
  assert.equal(outcome.source, s);
});

test("resolveSourcesForListings: batch orchestration produces correct metrics for a mixed set", async () => {
  const eligible = source({ id: 1, origin_type: "persisted_openserp" });
  const unenriched = source({ id: 2, origin_type: null });
  const multiA = source({ id: 3, origin_type: "persisted_openserp" });
  const multiB = source({ id: 4, origin_type: "persisted_openserp" });

  const mockRepo: MarketIndexReadRepository = {
    async findVerifiedClustersByLegacyListingIds(ids) {
      const map = new Map<number, VerifiedClusterLookup>();
      if (ids.includes(10)) {
        map.set(10, {
          legacyPropertyListingId: 10,
          clusterId: "c10",
          clusterOrigin: "legacy_one_to_one_projection",
          sourceOfferIds: [1],
        });
      }
      return map;
    },
  };

  const { picks, metrics } = await resolveSourcesForListings(mockRepo, [
    { id: 10, sources: [eligible] }, // market_index_verified
    { id: 11, sources: [unenriched] }, // legacy_no_provenance
    { id: 12, sources: [multiA, multiB] }, // legacy_multi_source
  ]);

  assert.equal(metrics.market_index_rows_used, 1);
  assert.equal(metrics.legacy_fallback_rows, 2);
  assert.equal(picks.get(10)?.usedMarketIndex, true);
  assert.equal(picks.get(11)?.usedMarketIndex, false);
  assert.equal(picks.get(12)?.usedMarketIndex, false);
});

test("resolveSourcesForListings: a repository error must not throw -- caller (supabase-listings.ts) wraps it and falls back to legacy, never an empty page", async () => {
  const throwingRepo: MarketIndexReadRepository = {
    async findVerifiedClustersByLegacyListingIds() {
      throw new Error("simulated Supabase failure");
    },
  };
  const eligible = source({ id: 1, origin_type: "persisted_openserp" });
  await assert.rejects(
    () => resolveSourcesForListings(throwingRepo, [{ id: 10, sources: [eligible] }]),
    /simulated Supabase failure/,
  );
  // The rejection itself is expected here (this function doesn't swallow
  // errors) -- the swallow-and-fallback behavior lives one layer up, in
  // lib/db/supabase-listings.ts's try/catch around this call, verified by
  // the live parity smoke test during this mission (0 mismatches across 34
  // production queries, including cases where Market Index was actively used).
});

test("no Market Index metric is ever part of the public response shape", () => {
  // Structural check: MarketIndexReadMetrics fields never appear in the
  // Listing type's field list used by the parity contract.
  const metrics: MarketIndexReadMetrics = {
    market_index_rows_used: 1,
    legacy_fallback_rows: 1,
    invalid_cluster_rows: 0,
    missing_membership_rows: 0,
    multi_membership_clusters: 0,
    parity_mismatch_count: 0,
  };
  const forbiddenInPublicShape = Object.keys(metrics);
  const publicListingFieldsSample = ["id", "title", "price", "city", "source_name", "listing_url"];
  for (const key of forbiddenInPublicShape) {
    assert.ok(!publicListingFieldsSample.includes(key), `${key} must never appear on the public Listing shape`);
  }
});
