import assert from "node:assert/strict";
import test from "node:test";
import {
  SITEMAP_FRESHNESS_CHANNEL,
  SITEMAP_FRESHNESS_TTL_DAYS,
  buildProposedSitemapFreshnessUpdate,
  canaryExpiresAt,
  selectDeterministicCanary,
} from "../daragadir-freshness-evidence-canary";

const before = {
  canonicalUrl: "https://daragadir.com/property/123",
  freshnessStatus: "seed_only",
  freshLastSeenAt: null,
  freshChannels: [],
  metadata: { source: "robots_declared_public_sitemap", sitemap_url: "https://daragadir.com/post-sitemap1.xml" },
};

const evidence = {
  canonicalUrl: before.canonicalUrl,
  observedAt: "2026-08-07T18:45:00.000Z",
  sitemapUrl: "https://daragadir.com/post-sitemap1.xml",
};

test("proposed update preserves original state in rollback and adds typed sitemap evidence", () => {
  const update = buildProposedSitemapFreshnessUpdate(before, evidence, evidence.observedAt);
  assert.equal(update.proposed.freshnessStatus, "fresh_confirmed");
  assert.equal(update.proposed.freshLastSeenAt, evidence.observedAt);
  assert.deepEqual(update.proposed.freshChannels, [SITEMAP_FRESHNESS_CHANNEL]);
  assert.deepEqual(update.rollback, {
    freshnessStatus: "seed_only",
    freshLastSeenAt: null,
    freshChannels: [],
    metadata: before.metadata,
  });
  const metadata = update.proposed.metadata.freshness_evidence as Record<string, unknown>;
  assert.deepEqual(metadata.sitemap_presence, {
    observed_at: evidence.observedAt,
    sitemap_url: evidence.sitemapUrl,
    channel: SITEMAP_FRESHNESS_CHANNEL,
    ttl_days: SITEMAP_FRESHNESS_TTL_DAYS,
  });
});

test("existing channels are preserved and deduplicated", () => {
  const update = buildProposedSitemapFreshnessUpdate(
    { ...before, freshChannels: ["openserp_yandex_discovery", SITEMAP_FRESHNESS_CHANNEL] },
    evidence,
    evidence.observedAt,
  );
  assert.deepEqual(update.proposed.freshChannels, ["openserp_yandex_discovery", SITEMAP_FRESHNESS_CHANNEL].sort());
});

test("canonical mismatch fails closed", () => {
  assert.throws(() => buildProposedSitemapFreshnessUpdate(before, { ...evidence, canonicalUrl: "https://daragadir.com/other" }, evidence.observedAt));
});

test("canary selection is deterministic and bounded", () => {
  const selected = selectDeterministicCanary([
    { canonicalUrl: "https://daragadir.com/z" },
    { canonicalUrl: "https://daragadir.com/a" },
    { canonicalUrl: "https://daragadir.com/m" },
  ], 2);
  assert.deepEqual(selected.map((row) => row.canonicalUrl), ["https://daragadir.com/a", "https://daragadir.com/m"]);
});

test("TTL is exactly 14 days", () => {
  assert.equal(canaryExpiresAt(evidence.observedAt), "2026-08-21T18:45:00.000Z");
});

test("TTL acceptance is bounded to 14 days with a reproducible evaluation clock", () => {
  assert.equal(
    buildProposedSitemapFreshnessUpdate(before, evidence, "2026-08-21T18:45:00.000Z").proposed.freshnessStatus,
    "fresh_confirmed",
  );
  assert.throws(
    () => buildProposedSitemapFreshnessUpdate(before, evidence, "2026-08-21T18:45:00.001Z"),
    /outside validity window/,
  );
});

test("future sitemap observation is never promoted", () => {
  assert.throws(
    () => buildProposedSitemapFreshnessUpdate(before, evidence, "2026-08-07T18:44:59.999Z"),
    /outside validity window/,
  );
});

test("invalid evaluation clock fails closed", () => {
  assert.throws(
    () => buildProposedSitemapFreshnessUpdate(before, evidence, "invalid-clock"),
    /Invalid freshness evaluation clock/,
  );
});

test("expired archived sitemap evidence cannot be replayed as fresh", () => {
  assert.throws(
    () => buildProposedSitemapFreshnessUpdate(before, evidence, "2026-11-06T10:00:00.000Z"),
    /outside validity window/,
  );
});
