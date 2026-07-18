// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — section 9.
// Bridges the static query-universe-v1.json catalog + the PostgreSQL-backed
// mutable state to the exact shapes query-rotation-planner.ts and
// budget-policy.ts already expect (RotationQuery, BudgetState) -- neither
// of those pure, tested modules changes at all for this mission. This file
// is the only place that knows both "what a query looks like in the JSON"
// and "what a query looks like in the DB".

import { sha256 } from "../utils";
import type { RotationQuery } from "../query-rotation-planner";
import { defaultBudgetState, type BudgetState, type EngineHealthState } from "../budget-policy";
import {
  loadQueryStates,
  seedMissingQueryStates,
  upsertQueryStates,
  type OpenSerpEngineName,
  type QueryRotationDbState,
} from "./query-rotation-state-repository";
import {
  loadEngineBudgetStates,
  upsertEngineBudgetStates,
  OPENSERP_ENGINE_BUDGET_STATE_VERSION,
  type EngineBudgetDbState,
} from "./engine-budget-state-repository";

const KNOWN_ENGINES: OpenSerpEngineName[] = ["bing", "duckduckgo", "ecosia"];

export type StaticQueryDefinition = {
  query_id: string;
  city: string;
  district: string | null;
  priority_tier: 1 | 2 | 3 | 4;
  transaction: "sale" | "rent";
  property_type: string;
  language: "fr" | "ar";
  preferred_engine: OpenSerpEngineName;
  query_text: string;
  target_domain: string | null;
  query_family: "general" | "brand_hint";
};

// Deterministic hash over exactly the fields that define what a query IS
// (not its rotation history) -- if any of these change between universe
// versions for the same query_id, the stored hash diverges and
// verifyStateCompatibility can flag it, rather than silently reusing stale
// rotation history for a query that now means something different.
export function hashQueryDefinition(def: StaticQueryDefinition): string {
  const canonical = [
    def.query_id,
    def.city,
    def.district ?? "",
    def.priority_tier,
    def.transaction,
    def.property_type,
    def.language,
    def.preferred_engine,
    def.query_text,
    def.target_domain ?? "",
    def.query_family,
  ].join("|");
  return sha256(canonical);
}

export async function hydrateRotationQueries<T extends StaticQueryDefinition>(
  definitions: readonly T[],
  universeVersion: string,
): Promise<Array<T & RotationQuery>> {
  const seedDefs = definitions.map((d) => ({
    query_id: d.query_id,
    query_universe_version: universeVersion,
    query_definition_hash: hashQueryDefinition(d),
  }));
  await seedMissingQueryStates(seedDefs);

  const states = await loadQueryStates(definitions.map((d) => d.query_id));

  return definitions.map((def) => {
    const state = states.get(def.query_id);
    return {
      ...def,
      last_executed_at: state?.last_executed_at ?? null,
      next_eligible_at: state?.next_eligible_at ?? null,
      failure_count: state?.failure_count ?? 0,
      discovery_yield: state?.discovery_yield ?? 0,
    };
  });
}

// Converts already-updated (via markQueryExecuted) RotationQuery entries
// back into DB rows and upserts them. Only entries that were actually part
// of this run's batch need to be passed -- untouched queries are left as-is
// in the DB (no need to re-upsert every query on every run).
export async function persistRotationUpdates(
  updated: ReadonlyArray<StaticQueryDefinition & RotationQuery & { succeeded?: boolean; engine?: OpenSerpEngineName }>,
  runId: string,
  universeVersion: string,
): Promise<void> {
  if (updated.length === 0) return;

  const existing = await loadQueryStates(updated.map((q) => q.query_id));

  const rows: QueryRotationDbState[] = updated.map((q) => {
    const previous = existing.get(q.query_id);
    return {
      query_id: q.query_id,
      query_universe_version: universeVersion,
      query_definition_hash: hashQueryDefinition(q),
      last_executed_at: q.last_executed_at,
      next_eligible_at: q.next_eligible_at,
      failure_count: q.failure_count,
      successful_run_count: (previous?.successful_run_count ?? 0) + (q.succeeded ? 1 : 0),
      discovery_yield: q.discovery_yield,
      last_engine: q.engine ?? previous?.last_engine ?? null,
      last_run_id: runId,
    };
  });

  await upsertQueryStates(rows, runId);
}

export async function loadBudgetState(): Promise<BudgetState> {
  const dbStates = await loadEngineBudgetStates(KNOWN_ENGINES);
  if (dbStates.size === 0) {
    return defaultBudgetState();
  }

  // current_budget/consecutive_clean_runs are mirrored identically across
  // all 3 engine rows (see engine-budget-state-repository.ts) -- any one of
  // them (falling back to the seeded default if a specific engine row is
  // somehow missing) carries the global value.
  const anyRow = dbStates.values().next().value as EngineBudgetDbState | undefined;
  const fallback = defaultBudgetState();

  const engines: EngineHealthState[] = KNOWN_ENGINES.map((engine) => {
    const row = dbStates.get(engine);
    return {
      engine,
      suspended_until: row?.suspended_until ?? null,
      // consecutive_clean_runs isn't separately tracked per engine in the DB
      // schema (the ODM's per-engine fields track failures/captcha/rate-limit
      // counts, not a clean-run streak) -- reconstructed as 0 whenever the
      // engine is currently suspended (matches budget-policy.ts's own reset
      // behavior on incident), otherwise as consecutive_failures == 0 ? the
      // global streak : 0, which is accurate for the only two states
      // applyRunOutcome ever leaves an engine in.
      consecutive_clean_runs: row && row.suspended_until && new Date(row.suspended_until).getTime() > Date.now()
        ? 0
        : (anyRow?.consecutive_failures ?? 0) === 0
          ? fallback.consecutive_clean_runs
          : 0,
    };
  });

  return {
    current_budget: anyRow?.current_budget ?? fallback.current_budget,
    consecutive_clean_runs: fallback.consecutive_clean_runs,
    engines,
  };
}

export async function persistBudgetState(state: BudgetState, runId: string): Promise<void> {
  const existing = await loadEngineBudgetStates(KNOWN_ENGINES);
  const now = new Date().toISOString();

  const rows: EngineBudgetDbState[] = state.engines.map((engineState) => {
    const previous = existing.get(engineState.engine);
    const wasJustSuspended = engineState.suspended_until !== (previous?.suspended_until ?? null) && engineState.suspended_until !== null;
    return {
      engine: engineState.engine,
      state_version: OPENSERP_ENGINE_BUDGET_STATE_VERSION,
      current_budget: state.current_budget,
      consecutive_failures: engineState.consecutive_clean_runs === 0 && engineState.suspended_until ? (previous?.consecutive_failures ?? 0) + 1 : 0,
      captcha_count: previous?.captcha_count ?? 0,
      rate_limit_count: previous?.rate_limit_count ?? 0,
      timeout_count: previous?.timeout_count ?? 0,
      suspended_until: engineState.suspended_until,
      last_success_at: engineState.suspended_until ? previous?.last_success_at ?? null : now,
      last_failure_at: wasJustSuspended ? now : previous?.last_failure_at ?? null,
      last_run_id: runId,
    };
  });

  await upsertEngineBudgetStates(rows, runId);
}

export type StateCompatibilityResult = {
  compatible: boolean;
  mismatched_query_ids: string[];
};

// Flags any query_id whose stored query_definition_hash no longer matches
// the hash freshly computed from the current query-universe-v1.json --
// meaning the query's own definition (city/tier/text/etc.) changed since
// its rotation state was last written, so its historical
// discovery_yield/failure_count may no longer be meaningful for the new
// definition. Does not auto-reset anything -- purely a reporting check for
// the caller (e.g. the seed script or a future audit) to act on.
export async function verifyStateCompatibility(
  definitions: readonly StaticQueryDefinition[],
  universeVersion: string,
): Promise<StateCompatibilityResult> {
  const states = await loadQueryStates(definitions.map((d) => d.query_id));
  const mismatched: string[] = [];

  for (const def of definitions) {
    const state = states.get(def.query_id);
    if (!state) continue; // not yet seeded -- not a mismatch, just missing
    const freshHash = hashQueryDefinition(def);
    if (state.query_definition_hash !== freshHash || state.query_universe_version !== universeVersion) {
      mismatched.push(def.query_id);
    }
  }

  return { compatible: mismatched.length === 0, mismatched_query_ids: mismatched };
}
