import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSISTENT_BATCH_RUN_ID,
  PERSISTENT_BATCH_SIZE,
  buildPersistentBatchPlan,
  selectPersistentBatch,
} from "../daragadir-first-persistent-batch";

const before = {
  canonicalUrl: "https://daragadir.com/property/123",
  freshnessStatus: "seed_only",
  freshLastSeenAt: null,
  freshChannels: [],
  metadata: { source: "robots_declared_public_sitemap", sitemap_url: "https://daragadir.com/post-sitemap1.xml" },
  updatedAt: "2026-08-07T19:42:18.708166Z",
};

const evidence = {
  canonicalUrl: before.canonicalUrl,
  observedAt: "2026-08-07T20:10:00.000Z",
  sitemapUrl: "https://daragadir.com/post-sitemap1.xml",
};

test("persistent batch is exactly 50", () => {
  assert.equal(PERSISTENT_BATCH_SIZE, 50);
  const rows = Array.from({ length: 60 }, (_, i) => ({ canonicalUrl: `https://daragadir.com/${String(59 - i).padStart(2, "0")}` }));
  const selected = selectPersistentBatch(rows);
  assert.equal(selected.length, 50);
  assert.equal(selected[0]?.canonicalUrl, "https://daragadir.com/00");
  assert.equal(selected[49]?.canonicalUrl, "https://daragadir.com/49");
});

test("persistent plan adds typed evidence and keeps rollback snapshot", () => {
  const plan = buildPersistentBatchPlan(before, evidence);
  assert.equal(plan.proposed.freshnessStatus, "fresh_confirmed");
  assert.ok(plan.proposed.freshChannels.includes("public_sitemap_presence"));
  const freshnessEvidence = plan.proposed.metadata.freshness_evidence as Record<string, unknown>;
  const marker = freshnessEvidence.persistent_batch as Record<string, unknown>;
  assert.equal(marker.run_id, PERSISTENT_BATCH_RUN_ID);
  assert.equal(marker.ttl_days, 14);
  assert.equal(plan.rollback.freshnessStatus, "seed_only");
  assert.equal(plan.rollback.updatedAtAuditOnly, before.updatedAt);
});

test("non-seed-only rows fail closed", () => {
  assert.throws(() => buildPersistentBatchPlan({ ...before, freshnessStatus: "fresh_confirmed" }, evidence));
});

test("rows already carrying sitemap channel fail closed", () => {
  assert.throws(() => buildPersistentBatchPlan({ ...before, freshChannels: ["public_sitemap_presence"] }, evidence));
});
