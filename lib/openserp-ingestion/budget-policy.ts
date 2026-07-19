// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 21.
// Pure functions for the "mode agressif controle" budget: start at 12
// queries/run, climb to 24 only after 6 consecutive clean runs, drop to 4
// immediately on any captcha/403/429/timeout/quality-drift signal, and
// suspend an engine for >= 6h after it captchas or gets rate-limited.

export type EngineHealthState = {
  engine: "bing" | "duckduckgo" | "ecosia";
  suspended_until: string | null;
  consecutive_clean_runs: number;
};

export type BudgetState = {
  current_budget: number;
  consecutive_clean_runs: number;
  engines: EngineHealthState[];
};

export const MIN_BUDGET = 4;
export const START_BUDGET = 12;
export const MAX_BUDGET = 24;
export const CLEAN_RUNS_TO_ESCALATE = 6;
export const ENGINE_SUSPENSION_MS = 6 * 60 * 60 * 1000; // 6 hours

// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 5.
// A distinct concept from current_budget above: current_budget is *how
// many queries the adaptive backoff policy currently trusts the engines
// with*, escalating over time. MAX_SERVERLESS_BATCH_SIZE is a hard,
// independent ceiling on how many of those queries a single serverless
// invocation may actually attempt, regardless of how high current_budget
// has climbed -- the two failure modes are different (current_budget
// protects against captcha/rate-limit incidents; this protects against
// the invocation itself running out of wall-clock time). Deliberately
// conservative: prefer several small, resumable invocations over one
// large invocation that risks FUNCTION_INVOCATION_TIMEOUT (the incident
// this constant was introduced to prevent -- see
// data/audits/openserp-serverless-state-real-run-attempt-result.json).
// Only applies to the serverless path (run-orchestrator.ts's own
// batchSizeOverride, used by the local CLI bootstrap script for its
// intentionally larger 25/100/300-query waves, is unaffected).
// OPENSERP-CRON-PROD-ACTIVATION-1: raised from 5 to 8 as the batch ceiling
// for the scheduled production cron run, per explicit mission decision --
// this constant is documented above as a hard, INDEPENDENT wall-clock
// safety ceiling, distinct from (and never modifying) the adaptive
// current_budget backoff/escalation/suspension algorithm itself, which is
// unchanged. 8 is still well within the two real production runs' actual
// per-query timing (each query took 3.1-4.6s; 8 queries x ~4.5s worst case
// plus writer overhead stays comfortably inside the 120s route budget with
// its 20s safety margin, matching the ~15-30s total duration observed on
// both real 4-query runs).
export const MAX_SERVERLESS_BATCH_SIZE = 8;

export function defaultBudgetState(): BudgetState {
  return {
    current_budget: START_BUDGET,
    consecutive_clean_runs: 0,
    engines: [
      { engine: "bing", suspended_until: null, consecutive_clean_runs: 0 },
      { engine: "duckduckgo", suspended_until: null, consecutive_clean_runs: 0 },
      { engine: "ecosia", suspended_until: null, consecutive_clean_runs: 0 },
    ],
  };
}

export type RunOutcomeSignals = {
  captcha_count: number;
  status_403_429: number;
  timeout_count: number;
  error_rate: number; // 0..1
  quality_drift: boolean; // e.g. listing_like_precision below threshold
  engines_with_captcha_or_ratelimit: Array<"bing" | "duckduckgo" | "ecosia">;
};

export function applyRunOutcome(state: BudgetState, outcome: RunOutcomeSignals, nowIso: string): BudgetState {
  const hasIncident =
    outcome.captcha_count > 0 ||
    outcome.status_403_429 > 0 ||
    outcome.timeout_count > 0 ||
    outcome.error_rate >= 0.05 ||
    outcome.quality_drift;

  const nextEngines = state.engines.map((engineState) => {
    if (outcome.engines_with_captcha_or_ratelimit.includes(engineState.engine)) {
      return {
        ...engineState,
        suspended_until: new Date(new Date(nowIso).getTime() + ENGINE_SUSPENSION_MS).toISOString(),
        consecutive_clean_runs: 0,
      };
    }
    const stillSuspended = engineState.suspended_until && new Date(engineState.suspended_until).getTime() > new Date(nowIso).getTime();
    return {
      ...engineState,
      consecutive_clean_runs: stillSuspended ? engineState.consecutive_clean_runs : engineState.consecutive_clean_runs + 1,
    };
  });

  if (hasIncident) {
    return {
      current_budget: MIN_BUDGET,
      consecutive_clean_runs: 0,
      engines: nextEngines,
    };
  }

  const consecutiveCleanRuns = state.consecutive_clean_runs + 1;
  const shouldEscalate = consecutiveCleanRuns >= CLEAN_RUNS_TO_ESCALATE && state.current_budget < MAX_BUDGET;

  return {
    current_budget: shouldEscalate ? Math.min(MAX_BUDGET, state.current_budget + 4) : state.current_budget,
    consecutive_clean_runs: shouldEscalate ? 0 : consecutiveCleanRuns,
    engines: nextEngines,
  };
}

export function activeEngines(state: BudgetState, nowIso: string): Array<"bing" | "duckduckgo" | "ecosia"> {
  const now = new Date(nowIso).getTime();
  return state.engines
    .filter((engineState) => !engineState.suspended_until || new Date(engineState.suspended_until).getTime() <= now)
    .map((engineState) => engineState.engine);
}
