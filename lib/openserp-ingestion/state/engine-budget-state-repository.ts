// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — section 9.
// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — Phase 4.
// Persists budget-policy.ts's BudgetState (previously written to the local
// engine-budget-state.json file, which crashes with EROFS on Vercel).
//
// budget-policy.ts's BudgetState has ONE global current_budget/
// consecutive_clean_runs shared across all engines, plus a per-engine
// suspension sub-state. The ODM's table (section 6.B) is keyed one row per
// engine. Rather than redesign budget-policy.ts's already-tested pure
// logic, the global fields are mirrored identically onto all 3 engine rows
// on every upsert (upsertEngineBudgetStates is always called with all 3
// engines at once by serverless-state-service.ts, so they never drift out
// of sync). See docs/OPENSERP_SERVERLESS_STATE_PERSISTENCE_1.md.
//
// No fallback to a filesystem write anywhere in this file, by design.
// Every call goes through withDbTimeout (real .abortSignal() cancellation,
// budget-aware refusal, structured instrumentation).

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { withDbTimeout } from "./db-call-guard";
import type { OpenSerpEngineName, DbCallContext } from "./query-rotation-state-repository";

export const OPENSERP_ENGINE_BUDGET_STATE_VERSION = "openserp-engine-budget-state-v1";

export type EngineBudgetDbState = {
  engine: OpenSerpEngineName;
  state_version: string;
  current_budget: number;
  consecutive_failures: number;
  captcha_count: number;
  rate_limit_count: number;
  timeout_count: number;
  suspended_until: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_run_id: string | null;
};

const KNOWN_ENGINES: OpenSerpEngineName[] = ["bing", "duckduckgo", "ecosia"];

export async function loadEngineBudgetStates(
  engines: OpenSerpEngineName[] = KNOWN_ENGINES,
  ctx: DbCallContext = {},
): Promise<Map<OpenSerpEngineName, EngineBudgetDbState>> {
  const map = new Map<OpenSerpEngineName, EngineBudgetDbState>();
  if (engines.length === 0) return map;

  const supabase = getSupabaseServerClient();
  const rows = await withDbTimeout({
    callName: "load_engine_budget_states",
    timeBudget: ctx.timeBudget,
    now: ctx.now,
    countRows: (r: EngineBudgetDbState[]) => r.length,
    run: async (signal) => {
      const { data, error } = await supabase
        .from("openserp_engine_budget_state")
        .select(
          "engine, state_version, current_budget, consecutive_failures, captcha_count, rate_limit_count, timeout_count, suspended_until, last_success_at, last_failure_at, last_run_id",
        )
        .in("engine", engines)
        .abortSignal(signal);
      if (error) throw new Error(`loadEngineBudgetStates failed: ${error.message}`);
      return (data ?? []) as EngineBudgetDbState[];
    },
  });

  for (const row of rows) map.set(row.engine, row);
  return map;
}

export async function upsertEngineBudgetStates(states: EngineBudgetDbState[], runId: string, ctx: DbCallContext = {}): Promise<void> {
  if (states.length === 0) return;

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = states.map((state) => ({
    ...state,
    last_run_id: runId,
    updated_at: now,
  }));

  await withDbTimeout({
    callName: "upsert_engine_budget_states",
    timeBudget: ctx.timeBudget,
    now: ctx.now,
    countRows: () => rows.length,
    run: async (signal) => {
      const { error } = await supabase
        .from("openserp_engine_budget_state")
        .upsert(rows, { onConflict: "engine" })
        .abortSignal(signal);
      if (error) throw new Error(`upsertEngineBudgetStates failed: ${error.message}`);
      return rows;
    },
  });
}
