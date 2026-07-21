// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#5/10)
// Pure unit tests for the seed freshness matcher: exact canonical_url
// matching only (no fuzzy), the fresh_confirmed/aging/stale/seed_only
// lifecycle boundaries, and the summary aggregation.

import test from "node:test";
import assert from "node:assert/strict";
import {
  matchSeedsToFreshObservations,
  summarizeFreshnessResults,
  FRESH_CONFIRMED_MAX_AGE_DAYS,
  AGING_MAX_AGE_DAYS,
  type SeedForMatching,
  type FreshDiscoveryObservation,
} from "../../../lib/seed-freshness/matcher.js";

const NOW = new Date("2026-07-21T00:00:00.000Z");

function seed(url: string, domain = "soukimmobilier.com"): SeedForMatching {
  return { canonical_url: url, source_domain: domain };
}

function obs(url: string, daysAgo: number, canonical = true): FreshDiscoveryObservation {
  const discoveredAt = new Date(NOW.getTime() - daysAgo * 86400000).toISOString();
  return canonical
    ? { canonical_url: url, source_url: url, discovered_at: discoveredAt, discovery_status: "accepted" }
    : { canonical_url: null, source_url: url, discovered_at: discoveredAt, discovery_status: "accepted" };
}

test("a seed never observed by a fresh channel stays seed_only", () => {
  const [result] = matchSeedsToFreshObservations([seed("https://soukimmobilier.com/fr/agadir/appartement/1")], [], NOW);
  assert.equal(result.freshness_status, "seed_only");
  assert.equal(result.fresh_last_seen_at, null);
  assert.deepEqual(result.fresh_channels, []);
});

test("exact canonical_url match within 30 days -> fresh_confirmed", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const [result] = matchSeedsToFreshObservations([seed(url)], [obs(url, 5)], NOW);
  assert.equal(result.freshness_status, "fresh_confirmed");
  assert.equal(result.fresh_channels.length > 0, true);
});

test("boundary: exactly 30 days is still fresh_confirmed, 31 days is aging", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const at30 = matchSeedsToFreshObservations([seed(url)], [obs(url, FRESH_CONFIRMED_MAX_AGE_DAYS)], NOW)[0];
  assert.equal(at30.freshness_status, "fresh_confirmed");
  const at31 = matchSeedsToFreshObservations([seed(url)], [obs(url, FRESH_CONFIRMED_MAX_AGE_DAYS + 1)], NOW)[0];
  assert.equal(at31.freshness_status, "aging");
});

test("boundary: exactly 90 days is still aging, 91 days is stale", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const at90 = matchSeedsToFreshObservations([seed(url)], [obs(url, AGING_MAX_AGE_DAYS)], NOW)[0];
  assert.equal(at90.freshness_status, "aging");
  const at91 = matchSeedsToFreshObservations([seed(url)], [obs(url, AGING_MAX_AGE_DAYS + 1)], NOW)[0];
  assert.equal(at91.freshness_status, "stale");
});

test("no fuzzy matching: a near-identical but not-exact URL never matches (trailing slash difference)", () => {
  const seedUrl = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const observedUrl = "https://soukimmobilier.com/fr/agadir/appartement/1/";
  const [result] = matchSeedsToFreshObservations([seed(seedUrl)], [obs(observedUrl, 1)], NOW);
  assert.equal(result.freshness_status, "seed_only", "trailing-slash variant must NOT fuzzy-match");
});

test("multiple observations of the same URL: only the MOST RECENT discovered_at is used", () => {
  const url = "https://soukimmobilier.com/fr/agadir/appartement/1";
  const observations = [obs(url, 100), obs(url, 10), obs(url, 200)];
  const [result] = matchSeedsToFreshObservations([seed(url)], observations, NOW);
  assert.equal(result.freshness_status, "fresh_confirmed", "most recent (10 days) should win, not the oldest or a random one");
  assert.equal(result.days_since_fresh, 10);
});

test("discovery_candidates rows with null canonical_url fall back to source_url for matching", () => {
  const url = "https://masaken.ma/en/immobilier-maroc/rental-apartment-agadir/1";
  const [result] = matchSeedsToFreshObservations([seed(url, "masaken.ma")], [obs(url, 5, false)], NOW);
  assert.equal(result.freshness_status, "fresh_confirmed");
});

test("summarizeFreshnessResults aggregates counts and computes fresh_rate correctly", () => {
  const results = matchSeedsToFreshObservations(
    [
      seed("https://a.com/1"), // seed_only
      seed("https://a.com/2"), // fresh_confirmed
      seed("https://a.com/3"), // aging
      seed("https://a.com/4"), // stale
    ],
    [obs("https://a.com/2", 5), obs("https://a.com/3", 50), obs("https://a.com/4", 200)],
    NOW,
  );
  const summary = summarizeFreshnessResults(results);
  assert.equal(summary.total_seeds, 4);
  assert.equal(summary.seed_only, 1);
  assert.equal(summary.fresh_confirmed, 1);
  assert.equal(summary.aging, 1);
  assert.equal(summary.stale, 1);
  assert.equal(summary.exact_fresh_overlap, 3);
  assert.equal(summary.fresh_rate, 0.75);
});

test("empty seed list produces an empty result set and a zero-safe summary", () => {
  const results = matchSeedsToFreshObservations([], [obs("https://a.com/1", 1)], NOW);
  assert.deepEqual(results, []);
  const summary = summarizeFreshnessResults(results);
  assert.equal(summary.total_seeds, 0);
  assert.equal(summary.fresh_rate, 0, "must not divide by zero");
});
