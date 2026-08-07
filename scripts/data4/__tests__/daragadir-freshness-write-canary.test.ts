import assert from "node:assert/strict";
import test from "node:test";
import {
  WRITE_CANARY_RUN_ID,
  WRITE_CANARY_SIZE,
  buildWriteCanaryPlan,
  selectWriteCanary,
} from "../daragadir-freshness-write-canary";

const before = {
  canonicalUrl: "https://daragadir.com/property/123",
  freshnessStatus: "seed_only",
  freshLastSeenAt: null,
  freshChannels: [],
  metadata: { source: "robots_declared_public_sitemap" },
};

const evidence = {
  canonicalUrl: before.canonicalUrl,
  observedAt: "2026-08-07T19:30:00.000Z",
  sitemapUrl: "https://daragadir.com/post-sitemap1.xml",
};

test("write plan promotes only freshness and embeds exact rollback snapshot", () => {
  const plan = buildWriteCanaryPlan(before, evidence);
  assert.equal(plan.proposed.freshnessStatus, "fresh_confirmed");
  assert.equal(plan.proposed.freshLastSeenAt, evidence.observedAt);
  assert.ok(plan.proposed.freshChannels.includes("public_sitemap_presence"));
  assert.deepEqual(plan.rollback, {
    freshnessStatus: before.freshnessStatus,
    freshLastSeenAt: before.freshLastSeenAt,
    freshChannels: before.freshChannels,
    metadata: before.metadata,
  });
  const freshnessEvidence = plan.proposed.metadata.freshness_evidence as Record<string, unknown>;
  const marker = freshnessEvidence.write_canary as Record<string, unknown>;
  assert.equal(marker.run_id, WRITE_CANARY_RUN_ID);
  assert.equal(marker.ttl_days, 14);
  const rollback = marker.rollback_snapshot as Record<string, unknown>;
  assert.equal(rollback.freshness_status, "seed_only");
  assert.deepEqual(rollback.metadata, before.metadata);
});

test("write canary refuses a non-seed-only starting state", () => {
  assert.throws(() => buildWriteCanaryPlan({ ...before, freshnessStatus: "fresh_confirmed" }, evidence));
});

test("write canary is deterministic and fixed to ten rows", () => {
  const rows = Array.from({ length: 20 }, (_, index) => ({ canonicalUrl: `https://daragadir.com/property/${String(20 - index).padStart(2, "0")}` }));
  const selected = selectWriteCanary(rows);
  assert.equal(selected.length, WRITE_CANARY_SIZE);
  assert.deepEqual(selected.map((row) => row.canonicalUrl), [...selected].map((row) => row.canonicalUrl).sort());
});
