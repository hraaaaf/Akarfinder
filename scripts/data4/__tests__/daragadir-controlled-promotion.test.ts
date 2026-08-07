import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_PERSISTENT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION,
  PROMOTION_CHANNEL,
  PROMOTION_TTL_DAYS,
  ROLLBACK_SEMANTICS,
  evaluatePromotionBoundary,
  isPromotionCandidate,
  selectPromotionBatch,
  snapshotPromotionRow,
} from "../daragadir-controlled-promotion";

test("promotion defaults remain conservative and bounded", () => {
  assert.equal(INITIAL_PERSISTENT_BATCH_SIZE, 50);
  assert.equal(MAX_BATCH_SIZE, 100);
  assert.equal(MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION, 500);
  assert.equal(PROMOTION_CHANNEL, "public_sitemap_presence");
  assert.equal(PROMOTION_TTL_DAYS, 14);
});

test("healthy boundary allows requested bounded batch", () => {
  const decision = evaluatePromotionBoundary({ registryEligible: true, registryReviewStatus: "due_soon", sitemapSignalPresent: true, requestedBatchSize: 50, cumulativeAppliedRows: 0, candidateRows: 5564, driftedRows: 0 });
  assert.equal(decision.allowed, true);
  assert.equal(decision.effectiveBatchSize, 50);
  assert.deepEqual(decision.stopReasons, []);
});

test("expired registry, missing sitemap or excessive drift fail closed", () => {
  const decision = evaluatePromotionBoundary({ registryEligible: true, registryReviewStatus: "expired", sitemapSignalPresent: false, requestedBatchSize: 50, cumulativeAppliedRows: 0, candidateRows: 100, driftedRows: 5 });
  assert.equal(decision.allowed, false);
  assert.ok(decision.stopReasons.includes("REGISTRY_REVIEW_EXPIRED"));
  assert.ok(decision.stopReasons.includes("SITEMAP_SIGNAL_MISSING"));
  assert.ok(decision.stopReasons.includes("DRIFT_ABOVE_THRESHOLD"));
});

test("batch size and cumulative cap are hard gates", () => {
  assert.equal(evaluatePromotionBoundary({ registryEligible: true, registryReviewStatus: "current", sitemapSignalPresent: true, requestedBatchSize: 101, cumulativeAppliedRows: 0, candidateRows: 5564, driftedRows: 0 }).allowed, false);
  assert.equal(evaluatePromotionBoundary({ registryEligible: true, registryReviewStatus: "current", sitemapSignalPresent: true, requestedBatchSize: 50, cumulativeAppliedRows: 500, candidateRows: 5564, driftedRows: 0 }).allowed, false);
});

test("selection is deterministic", () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({ canonicalUrl: `https://daragadir.com/${String(59 - i).padStart(2, "0")}` }));
  const selected = selectPromotionBatch(rows);
  assert.equal(selected.length, 50);
  assert.equal(selected[0]?.canonicalUrl, "https://daragadir.com/00");
  assert.equal(selected[49]?.canonicalUrl, "https://daragadir.com/49");
});

test("updated_at is captured but intentionally not rolled back", () => {
  assert.equal(ROLLBACK_SEMANTICS.restoreUpdatedAt, false);
  assert.equal(ROLLBACK_SEMANTICS.updatedAtSemantics, "AUDIT_TRAIL_NON_ROLLBACKABLE");
  const row = snapshotPromotionRow({ canonicalUrl: "https://daragadir.com/x", freshnessStatus: "seed_only", freshLastSeenAt: null, freshChannels: [], metadata: { source: "robots_declared_public_sitemap" }, updatedAt: "2026-08-07T19:42:18.708166Z" });
  assert.equal(row.updatedAt, "2026-08-07T19:42:18.708166Z");
  assert.equal(isPromotionCandidate(row), true);
});
