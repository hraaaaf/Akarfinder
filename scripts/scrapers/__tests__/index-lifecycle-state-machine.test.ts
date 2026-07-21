// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#9/10)
// Pure unit tests for the index lifecycle state machine: every transition,
// the seed-never-public invariant, reactivation-in-place, aging/stale
// demotion, and REMOVED terminality.

import test from "node:test";
import assert from "node:assert/strict";
import {
  applyLifecycleEvent,
  newSeedRecord,
  isPublishable,
  type LifecycleRecord,
} from "../../../lib/index-lifecycle/state-machine.js";

const T0 = "2026-01-01T00:00:00.000Z";
function daysAfter(base: string, days: number): string {
  return new Date(new Date(base).getTime() + days * 86400000).toISOString();
}

test("a new seed record starts DISCOVERED_SEED, not public, no fresh timestamp", () => {
  const rec = newSeedRecord("https://x.ma/1", T0);
  assert.equal(rec.state, "DISCOVERED_SEED");
  assert.equal(rec.last_fresh_seen_at, null);
  assert.equal(isPublishable(rec.state), false);
  assert.equal(rec.observation_count, 1);
});

test("seed_discovered on an existing seed bumps count + last_seen, never promotes, never sets fresh", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "seed_discovered", observed_at: daysAfter(T0, 5) });
  assert.equal(rec.state, "DISCOVERED_SEED");
  assert.equal(rec.observation_count, 2);
  assert.equal(rec.last_seen_at, daysAfter(T0, 5));
  assert.equal(rec.last_fresh_seen_at, null, "Common Crawl is not a fresh channel");
  assert.equal(isPublishable(rec.state), false);
});

test("a raw seed can NEVER be admitted directly (no listing from a seed alone)", () => {
  const rec = newSeedRecord("https://x.ma/1", T0);
  const after = applyLifecycleEvent(rec, { type: "admitted" });
  assert.equal(after.state, "DISCOVERED_SEED", "admission must be a no-op on a raw seed");
});

test("fresh_observation promotes a seed to FRESH_CONFIRMED (still not public until admitted)", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: daysAfter(T0, 3) });
  assert.equal(rec.state, "FRESH_CONFIRMED");
  assert.equal(rec.last_fresh_seen_at, daysAfter(T0, 3));
  assert.equal(isPublishable(rec.state), false, "fresh_confirmed alone is not publishable");
});

test("FRESH_CONFIRMED + admitted -> INDEXED (publishable)", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: daysAfter(T0, 3) });
  rec = applyLifecycleEvent(rec, { type: "admitted" });
  assert.equal(rec.state, "INDEXED");
  assert.equal(isPublishable(rec.state), true);
});

test("time_tick demotes INDEXED -> AGING after 30 days, -> STALE after 90 days", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: T0 });
  rec = applyLifecycleEvent(rec, { type: "admitted" });
  assert.equal(rec.state, "INDEXED");

  const aging = applyLifecycleEvent(rec, { type: "time_tick", now: daysAfter(T0, 45) });
  assert.equal(aging.state, "AGING");

  const stale = applyLifecycleEvent(aging, { type: "time_tick", now: daysAfter(T0, 120) });
  assert.equal(stale.state, "STALE");
  assert.equal(isPublishable(stale.state), false, "stale is not public");
});

test("time_tick is idempotent -- same now applied twice yields the same state", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: T0 });
  rec = applyLifecycleEvent(rec, { type: "admitted" });
  const once = applyLifecycleEvent(rec, { type: "time_tick", now: daysAfter(T0, 45) });
  const twice = applyLifecycleEvent(once, { type: "time_tick", now: daysAfter(T0, 45) });
  assert.deepEqual(once, twice);
});

test("a fresh_observation reactivates a STALE record IN PLACE (no new row, count increments)", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: T0 });
  rec = applyLifecycleEvent(rec, { type: "admitted" });
  rec = applyLifecycleEvent(rec, { type: "time_tick", now: daysAfter(T0, 120) });
  assert.equal(rec.state, "STALE");
  const countBefore = rec.observation_count;

  const reactivated = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: daysAfter(T0, 121) });
  assert.equal(reactivated.state, "INDEXED", "recent fresh obs restores an admitted record to INDEXED");
  assert.equal(reactivated.canonical_url, rec.canonical_url, "same record, not a duplicate");
  assert.equal(reactivated.observation_count, countBefore + 1);
});

test("time_tick never touches a raw seed or a fresh_confirmed-but-not-admitted record", () => {
  const seed = newSeedRecord("https://x.ma/1", T0);
  assert.deepEqual(applyLifecycleEvent(seed, { type: "time_tick", now: daysAfter(T0, 200) }), seed);

  const fresh = applyLifecycleEvent(seed, { type: "fresh_observation", observed_at: T0 });
  const ticked = applyLifecycleEvent(fresh, { type: "time_tick", now: daysAfter(T0, 200) });
  assert.equal(ticked.state, "FRESH_CONFIRMED", "un-admitted fresh_confirmed is not aged/staled by a tick");
});

test("remove_signal -> REMOVED, and a plain time_tick / seed_discovered never resurrects it", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: T0 });
  rec = applyLifecycleEvent(rec, { type: "admitted" });
  rec = applyLifecycleEvent(rec, { type: "remove_signal" });
  assert.equal(rec.state, "REMOVED");
  assert.equal(isPublishable(rec.state), false);

  const afterTick = applyLifecycleEvent(rec, { type: "time_tick", now: daysAfter(T0, 10) });
  assert.equal(afterTick.state, "REMOVED");
  const afterSeed = applyLifecycleEvent(rec, { type: "seed_discovered", observed_at: daysAfter(T0, 10) });
  assert.equal(afterSeed.state, "REMOVED");
});

test("a genuine fresh_observation CAN bring a REMOVED admitted listing back (it really came online again)", () => {
  let rec = newSeedRecord("https://x.ma/1", T0);
  rec = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: T0 });
  rec = applyLifecycleEvent(rec, { type: "admitted" });
  rec = applyLifecycleEvent(rec, { type: "remove_signal" });
  assert.equal(rec.state, "REMOVED");
  // A REMOVED record that was previously admitted is reactivated by a fresh obs.
  const back = applyLifecycleEvent(rec, { type: "fresh_observation", observed_at: daysAfter(T0, 5) });
  assert.notEqual(back.state, "REMOVED");
});

test("only INDEXED is publishable; every other state is excluded from public search", () => {
  for (const s of ["DISCOVERED_SEED", "FRESH_CONFIRMED", "AGING", "STALE", "REMOVED"] as const) {
    assert.equal(isPublishable(s), false, `${s} must be excluded from public search`);
  }
  assert.equal(isPublishable("INDEXED"), true);
});
