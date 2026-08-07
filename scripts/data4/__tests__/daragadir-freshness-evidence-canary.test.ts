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
  const update = buildProposedSitemapFreshnessUpdate(before, evidence);
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
  );
  assert.deepEqual(update.proposed.freshChannels, ["openserp_yandex_discovery", SITEMAP_FRESHNESS_CHANNEL].sort());
});

test("canonical mismatch fails closed", () => {
  assert.throws(() => buildProposedSitemapFreshnessUpdate(before, { ...evidence, canonicalUrl: "https://daragadir.com/other" }));
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
