// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#5/10)
// Tests freshness batch computation plus DATA-4.3I channel ownership.

import test from "node:test";
import assert from "node:assert/strict";
import {
  computeChannelOwnedFreshnessUpdateBatch,
  computeFreshnessUpdateBatch,
  type ExistingSeedFreshnessState,
} from "../../../lib/seed-freshness/job.js";
import type { SeedForMatching, FreshDiscoveryObservation } from "../../../lib/seed-freshness/matcher.js";

const NOW = new Date("2026-07-21T00:00:00.000Z");

function seed(url: string): SeedForMatching {
  return { canonical_url: url, source_domain: "soukimmobilier.com" };
}

function obs(url: string, daysAgo: number): FreshDiscoveryObservation {
  return { canonical_url: url, source_url: url, discovered_at: new Date(NOW.getTime() - daysAgo * 86400000).toISOString(), discovery_status: "accepted" };
}

function state(status: ExistingSeedFreshnessState["freshness_status"], channels: string[] = [], lastSeen: string | null = null): ExistingSeedFreshnessState {
  return { freshness_status: status, fresh_last_seen_at: lastSeen, fresh_channels: channels };
}

test("a row whose recorded previous status already matches seed_only produces no change", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const previous = new Map([[url, "seed_only" as const]]);
  const batch = computeFreshnessUpdateBatch([seed(url)], [], previous, NOW);
  assert.equal(batch.length, 0);
});

test("explicit transition INTO seed_only from a DIFFERENT previous status is detected as changed", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const previous = new Map([[url, "fresh_confirmed" as const]]);
  const batch = computeFreshnessUpdateBatch([seed(url)], [], previous, NOW);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].freshness_status, "seed_only");
});

test("re-running with IDENTICAL inputs produces an EMPTY batch", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const freshObservations = [obs(url, 5)];
  const previous = new Map([[url, "fresh_confirmed" as const]]);
  const batch = computeFreshnessUpdateBatch([seed(url)], freshObservations, previous, NOW);
  assert.equal(batch.length, 0);
});

test("state transition seed_only -> fresh_confirmed is detected", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const previous = new Map([[url, "seed_only" as const]]);
  const batch = computeFreshnessUpdateBatch([seed(url)], [obs(url, 5)], previous, NOW);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].freshness_status, "fresh_confirmed");
  assert.equal(batch[0].canonical_url, url);
});

test("state transition fresh_confirmed -> aging is detected in historical single-channel contract", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const previous = new Map([[url, "fresh_confirmed" as const]]);
  const batch = computeFreshnessUpdateBatch([seed(url)], [obs(url, 45)], previous, NOW);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].freshness_status, "aging");
});

test("multiple seeds: only changed rows appear in historical batch", () => {
  const unchanged = "https://soukimmobilier.com/fr/agadir/appartement/unchanged";
  const changed = "https://soukimmobilier.com/fr/agadir/appartement/changed";
  const previous = new Map([
    [unchanged, "fresh_confirmed" as const],
    [changed, "seed_only" as const],
  ]);
  const batch = computeFreshnessUpdateBatch(
    [seed(unchanged), seed(changed)],
    [obs(unchanged, 5), obs(changed, 5)],
    previous,
    NOW,
  );
  assert.equal(batch.length, 1);
  assert.equal(batch[0].canonical_url, changed);
});

test("updated_at is identical across one historical batch", () => {
  const previous = new Map([
    ["https://a.com/1", "seed_only" as const],
    ["https://a.com/2", "seed_only" as const],
  ]);
  const batch = computeFreshnessUpdateBatch(
    [seed("https://a.com/1"), seed("https://a.com/2")],
    [obs("https://a.com/1", 1), obs("https://a.com/2", 1)],
    previous,
    NOW,
  );
  assert.equal(batch.length, 2);
  assert.equal(batch[0].updated_at, batch[1].updated_at);
  assert.equal(batch[0].updated_at, NOW.toISOString());
});

test("OpenSERP reconciler cannot downgrade a foreign freshness channel when it has no observation", () => {
  const url = "https://daragadir.com/property/1";
  const existing = new Map([[url, state("fresh_confirmed", ["public_sitemap_presence"], "2026-07-20T00:00:00.000Z")]]);
  const batch = computeChannelOwnedFreshnessUpdateBatch([seed(url)], [], existing, NOW);
  assert.deepEqual(batch, []);
});

test("fresh OpenSERP evidence is merged additively with a foreign channel", () => {
  const url = "https://daragadir.com/property/2";
  const existing = new Map([[url, state("fresh_confirmed", ["public_sitemap_presence"], "2026-07-19T00:00:00.000Z")]]);
  const batch = computeChannelOwnedFreshnessUpdateBatch([seed(url)], [obs(url, 1)], existing, NOW);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].freshness_status, "fresh_confirmed");
  assert.deepEqual(batch[0].fresh_channels, ["openserp_yandex_discovery", "public_sitemap_presence"]);
  assert.equal(batch[0].fresh_last_seen_at, "2026-07-20T00:00:00.000Z");
});

test("aging OpenSERP evidence cannot degrade stronger foreign-channel state", () => {
  const url = "https://daragadir.com/property/3";
  const existing = new Map([[url, state("fresh_confirmed", ["public_sitemap_presence"], "2026-07-20T00:00:00.000Z")]]);
  const batch = computeChannelOwnedFreshnessUpdateBatch([seed(url)], [obs(url, 45)], existing, NOW);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].freshness_status, "fresh_confirmed");
  assert.deepEqual(batch[0].fresh_channels, ["openserp_yandex_discovery", "public_sitemap_presence"]);
  assert.equal(batch[0].fresh_last_seen_at, "2026-07-20T00:00:00.000Z");
});

test("ordinary OpenSERP-owned row keeps legacy downgrade semantics", () => {
  const url = "https://soukimmobilier.com/property/4";
  const existing = new Map([[url, state("fresh_confirmed", ["openserp_yandex_discovery"], "2026-07-20T00:00:00.000Z")]]);
  const batch = computeChannelOwnedFreshnessUpdateBatch([seed(url)], [], existing, NOW);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].freshness_status, "seed_only");
  assert.deepEqual(batch[0].fresh_channels, []);
  assert.equal(batch[0].fresh_last_seen_at, null);
});
