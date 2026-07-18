// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — section 9.
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

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { OpenSerpEngineName } from "./query-rotation-state-repository";

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
): Promise<Map<OpenSerpEngineName, EngineBudgetDbState>> {
  const map = new Map<OpenSerpEngineName, EngineBudgetDbState>();
  if (engines.length === 0) return map;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("openserp_engine_budget_state")
    .select(
      "engine, state_version, current_budget, consecutive_failures, captcha_count, rate_limit_count, timeout_count, suspended_until, last_success_at, last_failure_at, last_run_id",
    )
    .in("engine", engines);

  if (error) {
    throw new Error(`loadEngineBudgetStates failed: ${error.message}`);
  }

  for (const row of data ?? []) {
    map.set(row.engine as OpenSerpEngineName, row as EngineBudgetDbState);
  }
  return map;
}

export async function upsertEngineBudgetStates(states: EngineBudgetDbState[], runId: string): Promise<void> {
  if (states.length === 0) return;

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = states.map((state) => ({
    ...state,
    last_run_id: runId,
    updated_at: now,
  }));

  const { error } = await supabase.from("openserp_engine_budget_state").upsert(rows, { onConflict: "engine" });
  if (error) {
    throw new Error(`upsertEngineBudgetStates failed: ${error.message}`);
  }
}
