import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPANSION_BATCH_RUN_ID,
  buildExpansionPersistentBatchPlan,
  expansionBatchRunId,
} from "../daragadir-expansion-persistent-batch";

const before = {
  canonicalUrl: "https://daragadir.com/annonces/example.html",
  freshnessStatus: "seed_only",
  freshLastSeenAt: null,
  freshChannels: [] as string[],
  metadata: { source: "seed" } as Record<string, unknown>,
  updatedAt: "2026-08-08T00:00:00.000Z",
};

const evidence = {
  canonicalUrl: before.canonicalUrl,
  observedAt: "2026-08-08T01:00:00.000Z",
  sitemapUrl: "https://daragadir.com/post-sitemap.xml",
};

test("builds typed first expansion batch with exact rollback snapshot", () => {
  const plan = buildExpansionPersistentBatchPlan(before, evidence);
  assert.equal(plan.proposed.freshnessStatus, "fresh_confirmed");
  assert.deepEqual(plan.proposed.freshChannels, ["public_sitemap_presence"]);
  assert.deepEqual(plan.rollback.freshChannels, []);
  assert.equal(plan.rollback.freshnessStatus, "seed_only");
  assert.deepEqual(plan.rollback.metadata, { source: "seed" });

  const freshnessEvidence = plan.proposed.metadata.freshness_evidence as Record<string, unknown>;
  const marker = freshnessEvidence.controlled_expansion_batch as Record<string, unknown>;
  assert.equal(marker.run_id, EXPANSION_BATCH_RUN_ID);
  assert.equal(marker.batch_number, 1);
  assert.equal(marker.channel, "public_sitemap_presence");
  assert.equal(marker.ttl_days, 14);
});

test("builds a distinct typed second expansion batch", () => {
  const plan = buildExpansionPersistentBatchPlan(before, evidence, 2);
  const freshnessEvidence = plan.proposed.metadata.freshness_evidence as Record<string, unknown>;
  const marker = freshnessEvidence.controlled_expansion_batch as Record<string, unknown>;
  assert.equal(marker.run_id, "data-4-3h-daragadir-batch-2-v1");
  assert.equal(marker.batch_number, 2);
});

test("run id rejects invalid batch numbers", () => {
  assert.equal(expansionBatchRunId(5), "data-4-3h-daragadir-batch-5-v1");
  assert.throws(() => expansionBatchRunId(0));
  assert.throws(() => expansionBatchRunId(6));
});

test("rejects non-seed rows", () => {
  assert.throws(() => buildExpansionPersistentBatchPlan({ ...before, freshnessStatus: "fresh_confirmed" }, evidence));
});

test("rejects rows already carrying sitemap freshness", () => {
  assert.throws(() => buildExpansionPersistentBatchPlan({ ...before, freshChannels: ["public_sitemap_presence"] }, evidence));
});
