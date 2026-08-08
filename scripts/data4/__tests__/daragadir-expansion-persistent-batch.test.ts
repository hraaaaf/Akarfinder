import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPANSION_BATCH_RUN_ID,
  buildExpansionPersistentBatchPlan,
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

  const sitemapPresence = freshnessEvidence.sitemap_presence as Record<string, unknown>;
  assert.equal(sitemapPresence.sitemap_url, evidence.sitemapUrl);
  assert.equal(sitemapPresence.observed_at, evidence.observedAt);
});

test("rejects non-seed rows", () => {
  assert.throws(() => buildExpansionPersistentBatchPlan({ ...before, freshnessStatus: "fresh_confirmed" }, evidence));
});

test("rejects rows already carrying sitemap freshness", () => {
  assert.throws(() => buildExpansionPersistentBatchPlan({ ...before, freshChannels: ["public_sitemap_presence"] }, evidence));
});
