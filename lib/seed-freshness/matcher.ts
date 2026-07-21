// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#5/10) -- Seed Freshness
// Validation Engine.
//
// Separates HISTORICAL SEED (source_offer_seeds, Common Crawl-only) from
// FRESH SOURCE OFFER OBSERVATION (an authorized fresh channel -- OpenSERP or
// Yandex/SearXNG, both of which write discovery_candidates -- has re-observed
// the EXACT SAME canonical_url). No direct page fetch of any kind is
// performed here or anywhere in this module. No fuzzy matching: a seed is
// only ever promoted out of seed_only by an exact canonical_url string match
// against a fresh discovery observation.

export type FreshnessStatus = "seed_only" | "fresh_confirmed" | "aging" | "stale";

export const FRESH_CONFIRMED_MAX_AGE_DAYS = 30;
export const AGING_MAX_AGE_DAYS = 90;

export type SeedForMatching = {
  canonical_url: string;
  source_domain: string;
};

// Shape of a row read from discovery_candidates -- the only tables written
// by the two authorized fresh channels (OpenSERP, Yandex/SearXNG).
export type FreshDiscoveryObservation = {
  canonical_url: string | null;
  source_url: string;
  discovered_at: string; // ISO 8601
  discovery_status: string;
};

export type SeedFreshnessResult = {
  canonical_url: string;
  freshness_status: FreshnessStatus;
  fresh_last_seen_at: string | null;
  fresh_channels: string[];
  days_since_fresh: number | null;
};

function classifyByAge(daysSinceLastFresh: number): "fresh_confirmed" | "aging" | "stale" {
  if (daysSinceLastFresh <= FRESH_CONFIRMED_MAX_AGE_DAYS) return "fresh_confirmed";
  if (daysSinceLastFresh <= AGING_MAX_AGE_DAYS) return "aging";
  return "stale";
}

// Exact-match index: canonical_url -> most recent discovered_at seen for
// that exact URL across all fresh discovery observations. Falls back to
// source_url only when canonical_url is null (matches how discovery_
// candidates itself is populated -- canonical_url is nullable there).
function buildFreshIndex(observations: FreshDiscoveryObservation[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const obs of observations) {
    const key = obs.canonical_url ?? obs.source_url;
    if (!key) continue;
    const existing = index.get(key);
    if (!existing || new Date(obs.discovered_at).getTime() > new Date(existing).getTime()) {
      index.set(key, obs.discovered_at);
    }
  }
  return index;
}

export function matchSeedsToFreshObservations(
  seeds: SeedForMatching[],
  freshObservations: FreshDiscoveryObservation[],
  now: Date = new Date(),
): SeedFreshnessResult[] {
  const freshIndex = buildFreshIndex(freshObservations);

  return seeds.map((seed): SeedFreshnessResult => {
    const lastFresh = freshIndex.get(seed.canonical_url);
    if (!lastFresh) {
      return {
        canonical_url: seed.canonical_url,
        freshness_status: "seed_only",
        fresh_last_seen_at: null,
        fresh_channels: [],
        days_since_fresh: null,
      };
    }
    const daysSince = (now.getTime() - new Date(lastFresh).getTime()) / (1000 * 60 * 60 * 24);
    return {
      canonical_url: seed.canonical_url,
      freshness_status: classifyByAge(daysSince),
      fresh_last_seen_at: lastFresh,
      fresh_channels: ["openserp_yandex_discovery"],
      days_since_fresh: Number(daysSince.toFixed(2)),
    };
  });
}

export type FreshnessSummary = {
  total_seeds: number;
  exact_fresh_overlap: number;
  fresh_confirmed: number;
  aging: number;
  stale: number;
  seed_only: number;
  fresh_rate: number;
};

export function summarizeFreshnessResults(results: SeedFreshnessResult[]): FreshnessSummary {
  const counts: Record<FreshnessStatus, number> = { seed_only: 0, fresh_confirmed: 0, aging: 0, stale: 0 };
  for (const r of results) counts[r.freshness_status] += 1;
  const exactFreshOverlap = counts.fresh_confirmed + counts.aging + counts.stale;
  return {
    total_seeds: results.length,
    exact_fresh_overlap: exactFreshOverlap,
    fresh_confirmed: counts.fresh_confirmed,
    aging: counts.aging,
    stale: counts.stale,
    seed_only: counts.seed_only,
    fresh_rate: results.length === 0 ? 0 : Number((exactFreshOverlap / results.length).toFixed(4)),
  };
}
