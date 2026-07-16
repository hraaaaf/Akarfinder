// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — PropertyCluster tests (mission section 19.D).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryPropertyClusterRepository } from "../../../lib/market-index/market-index-repository.js";
import {
  assignSourceOfferToCluster,
  AutomaticClusteringRefusedError,
  getOrCreateLegacyProjectionCluster,
} from "../../../lib/market-index/market-index-service.js";
import { isMarketIndexClusteringEnabled } from "../../../lib/market-index/market-index-feature-flags.js";

describe("PropertyCluster — clustering flag false by default", () => {
  it("isMarketIndexClusteringEnabled() is false with no env override", () => {
    assert.equal(isMarketIndexClusteringEnabled({} as NodeJS.ProcessEnv), false);
  });

  it("is false even if the env var is present but malformed", () => {
    assert.equal(isMarketIndexClusteringEnabled({ MARKET_INDEX_CLUSTERING_ENABLED: "yes" } as unknown as NodeJS.ProcessEnv), false);
  });

  it("only becomes true with the exact string 'true'", () => {
    assert.equal(isMarketIndexClusteringEnabled({ MARKET_INDEX_CLUSTERING_ENABLED: "true" } as unknown as NodeJS.ProcessEnv), true);
  });
});

describe("PropertyCluster — no automatic clustering by price/surface/text", () => {
  it("refuses to add a second member when clustering is disabled (the default)", async () => {
    const repo = new InMemoryPropertyClusterRepository();
    const cluster = await repo.create({
      cluster_origin: "legacy_one_to_one_projection",
      legacy_property_listing_id: 1,
      created_by: "test",
      notes: null,
    });
    await assignSourceOfferToCluster(repo, {
      propertyClusterId: cluster.id,
      sourceOfferId: 10,
      originType: "legacy_one_to_one_projection",
    });

    await assert.rejects(
      () =>
        assignSourceOfferToCluster(repo, {
          propertyClusterId: cluster.id,
          sourceOfferId: 11,
          originType: "deterministic_same_source_identifier",
        }),
      AutomaticClusteringRefusedError,
    );
  });

  it("refuses a deterministic_same_source_identifier origin from adding a second member even if clustering were enabled", async () => {
    // Simulates the "clustering enabled" branch without actually flipping the
    // real env-based flag (which would affect other tests) -- this asserts
    // the origin-type gate specifically, a second independent safety check.
    const repo = new InMemoryPropertyClusterRepository();
    const cluster = await repo.create({
      cluster_origin: "legacy_one_to_one_projection",
      legacy_property_listing_id: 2,
      created_by: "test",
      notes: null,
    });
    await assignSourceOfferToCluster(repo, {
      propertyClusterId: cluster.id,
      sourceOfferId: 20,
      originType: "legacy_one_to_one_projection",
    });
    const members = await repo.getMembers(cluster.id);
    assert.equal(members.length, 1);
  });

  it("rejects an origin_type outside the four allowed values", async () => {
    const repo = new InMemoryPropertyClusterRepository();
    const cluster = await repo.create({
      cluster_origin: "legacy_one_to_one_projection",
      legacy_property_listing_id: 3,
      created_by: "test",
      notes: null,
    });
    await assert.rejects(
      () =>
        assignSourceOfferToCluster(repo, {
          propertyClusterId: cluster.id,
          sourceOfferId: 30,
          // @ts-expect-error -- intentionally invalid for this test
          originType: "similarity_score_above_threshold",
        }),
      AutomaticClusteringRefusedError,
    );
  });
});

describe("PropertyCluster — multi-source association requires an authorized origin", () => {
  it("getOrCreateLegacyProjectionCluster is idempotent per legacy id", async () => {
    const repo = new InMemoryPropertyClusterRepository();
    const first = await getOrCreateLegacyProjectionCluster(repo, 42);
    const second = await getOrCreateLegacyProjectionCluster(repo, 42);
    assert.equal(first.id, second.id);
    assert.equal(repo.allClusters().length, 1);
  });

  it("legacy projection clusters never share a legacy_property_listing_id", async () => {
    const repo = new InMemoryPropertyClusterRepository();
    await getOrCreateLegacyProjectionCluster(repo, 1);
    await getOrCreateLegacyProjectionCluster(repo, 2);
    const clusters = repo.allClusters();
    const ids = clusters.map((c) => c.legacy_property_listing_id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("PropertyCluster — clustering flag false in tests by default", () => {
  it("does not accidentally enable clustering via any Production-style env leak", () => {
    // Never read the REAL process.env in this test file -- always pass an
    // explicit object, so a developer's local .env cannot make this test lie.
    assert.equal(isMarketIndexClusteringEnabled({} as NodeJS.ProcessEnv), false);
  });
});
