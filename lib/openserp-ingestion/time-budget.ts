// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 3.
// Pure, injectable-clock time budget so an ingestion invocation can stop
// itself well before Vercel's own platform-level FUNCTION_INVOCATION_TIMEOUT
// (the root cause of the incident this mission fixes — see
// data/audits/openserp-serverless-state-real-run-attempt-result.json).
// No wall-clock waiting in tests: every function here takes an explicit
// "now" reading (or a `now()` accessor), so tests can fake time instantly.

export type TimeBudget = {
  readonly startedAtMs: number;
  readonly routeMaxDurationMs: number;
  readonly safetyMarginMs: number;
  readonly deadlineMs: number;
};

// Single named default so the margin is never a magic number scattered
// across call sites -- override via createTimeBudget's safetyMarginMs
// input (e.g. from an env var) for configurability without touching this
// constant.
export const DEFAULT_SAFETY_MARGIN_MS = 20_000;

export function createTimeBudget(input: {
  routeMaxDurationMs: number;
  safetyMarginMs?: number;
  now?: () => number;
}): TimeBudget {
  const now = input.now ?? Date.now;
  const startedAtMs = now();
  const safetyMarginMs = input.safetyMarginMs ?? DEFAULT_SAFETY_MARGIN_MS;
  // Never negative: if the margin somehow exceeds the route's own limit,
  // the deadline collapses to "right now" (budget already exhausted)
  // rather than wrapping to a deadline in the past relative to start.
  const usableMs = Math.max(0, input.routeMaxDurationMs - safetyMarginMs);
  return {
    startedAtMs,
    routeMaxDurationMs: input.routeMaxDurationMs,
    safetyMarginMs,
    deadlineMs: startedAtMs + usableMs,
  };
}

export function remainingBudgetMs(budget: TimeBudget, now: () => number = Date.now): number {
  return budget.deadlineMs - now();
}

export function isTimeBudgetExhausted(budget: TimeBudget, now: () => number = Date.now): boolean {
  return remainingBudgetMs(budget, now) <= 0;
}

export function elapsedMs(budget: TimeBudget, now: () => number = Date.now): number {
  return now() - budget.startedAtMs;
}

export type TimeBudgetSnapshot = {
  elapsed_ms: number;
  remaining_ms: number;
  route_max_duration_ms: number;
  safety_margin_ms: number;
  exhausted: boolean;
};

export function snapshotTimeBudget(budget: TimeBudget, now: () => number = Date.now): TimeBudgetSnapshot {
  return {
    elapsed_ms: elapsedMs(budget, now),
    remaining_ms: remainingBudgetMs(budget, now),
    route_max_duration_ms: budget.routeMaxDurationMs,
    safety_margin_ms: budget.safetyMarginMs,
    exhausted: isTimeBudgetExhausted(budget, now),
  };
}
