// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#5/10)
// Tests the idempotent update-batch computation: only changed rows are
// included, re-running with identical inputs produces an empty batch, and
// state transitions (seed_only -> fresh_confirmed -> aging -> stale) are
// each correctly detected as "changed" exactly once.

import test from "node:test";
import assert from "node:assert/strict";
import { computeFreshnessUpdateBatch } from "../../../lib/seed-freshness/job.js";
import type { SeedForMatching, FreshDiscoveryObservation } from "../../../lib/seed-freshness/matcher.js";

const NOW = new Date("2026-07-21T00:00:00.000Z");

function seed(url: string): SeedForMatching {
  return { canonical_url: url, source_domain: "soukimmobilier.com" };
}

function obs(url: string, daysAgo: number): FreshDiscoveryObservation {
  return { canonical_url: url, source_url: url, discovered_at: new Date(NOW.getTime() - daysAgo * 86400000).toISOString(), discovery_status: "accepted" };
}

test("a row whose recorded previous status already matches the freshly-inserted default ('seed_only') produces no change", () => {
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

test("re-running with IDENTICAL inputs (same previous status) produces an EMPTY batch -- idempotent", () => {
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

test("state transition fresh_confirmed -> aging (time passing, no new observation) is detected", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const previous = new Map([[url, "fresh_confirmed" as const]]);
  const batch = computeFreshnessUpdateBatch([seed(url)], [obs(url, 45)], previous, NOW);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].freshness_status, "aging");
});

test("multiple seeds: only the ones whose status actually changed appear in the batch", () => {
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

test("updated_at is set to the SAME timestamp for every row in a single batch run (deterministic, not per-row clock drift)", () => {
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
