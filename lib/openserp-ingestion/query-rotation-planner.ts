// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 11.
// Picks the next batch of queries to execute from the national universe,
// respecting the rotation priority order the mission specifies:
//   1. never-executed queries
//   2. queries with a historically high discovery_yield
//   3. under-covered cities
//   4. under-covered districts
//   5. queries not executed recently
// Pure function — no I/O, no network, no randomness (deterministic given the
// same universe + "now" timestamp), fully unit-testable.

export type RotationQuery = {
  query_id: string;
  city: string;
  district: string | null;
  priority_tier: 1 | 2 | 3 | 4;
  last_executed_at: string | null;
  next_eligible_at: string | null;
  failure_count: number;
  discovery_yield: number;
};

export function selectNextBatch<T extends RotationQuery>(
  universe: readonly T[],
  budget: number,
  nowIso: string,
): T[] {
  const now = new Date(nowIso).getTime();

  const eligible = universe.filter((query) => {
    if (!query.next_eligible_at) return true;
    return new Date(query.next_eligible_at).getTime() <= now;
  });

  const cityCoverage = new Map<string, number>();
  const districtCoverage = new Map<string, number>();
  for (const query of universe) {
    if (query.last_executed_at) {
      cityCoverage.set(query.city, (cityCoverage.get(query.city) ?? 0) + 1);
      if (query.district) {
        const key = `${query.city}::${query.district}`;
        districtCoverage.set(key, (districtCoverage.get(key) ?? 0) + 1);
      }
    }
  }

  const scored = eligible.map((query) => {
    const neverExecuted = query.last_executed_at === null ? 1 : 0;
    const yieldScore = query.discovery_yield;
    const cityUndercoverage = -(cityCoverage.get(query.city) ?? 0);
    const districtKey = query.district ? `${query.city}::${query.district}` : null;
    const districtUndercoverage = districtKey ? -(districtCoverage.get(districtKey) ?? 0) : 0;
    const staleness = query.last_executed_at ? now - new Date(query.last_executed_at).getTime() : 0;
    // Empirically, during this mission's own live smoke testing, generic
    // city-only queries (priority_tier 1) consistently surfaced portal
    // CATEGORY pages (e.g. mubawab.ma "/fr/st/casablanca/...") rather than
    // individual listings -- 0/114 admitted across two independent batches --
    // while district-level queries (tier 3) are the category the historical
    // OPENSERP-TO-SUPABASE-FIRST-WRITE-1 pilot actually used to write 177
    // real listings. tierBoost therefore favors HIGHER tier numbers (more
    // specific queries) rather than treating tier 1 as "most important" --
    // breadth-first-by-tier would burn the query budget on the
    // lowest-yield category first. discovery_yield (learned per query from
    // real results) still dominates once any query in a tier has run.
    const tierBoost = query.priority_tier;
    const failurePenalty = -query.failure_count * 5;

    return {
      query,
      score:
        neverExecuted * 1_000_000 +
        yieldScore * 1_000 +
        cityUndercoverage * 100 +
        districtUndercoverage * 50 +
        tierBoost * 20 +
        staleness / (1000 * 60 * 60) + // hours since last run, small tiebreaker
        failurePenalty,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.query.query_id.localeCompare(b.query.query_id); // deterministic tiebreak
  });

  return scored.slice(0, Math.max(0, budget)).map((entry) => entry.query);
}

export function markQueryExecuted<T extends RotationQuery>(
  query: T,
  input: { executedAtIso: string; succeeded: boolean; acceptedCount: number },
): T {
  return {
    ...query,
    last_executed_at: input.executedAtIso,
    next_eligible_at: null,
    failure_count: input.succeeded ? 0 : query.failure_count + 1,
    discovery_yield: input.succeeded
      ? Math.round((query.discovery_yield * 0.7 + input.acceptedCount * 0.3) * 100) / 100
      : query.discovery_yield,
  };
}
