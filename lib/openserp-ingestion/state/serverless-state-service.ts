// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — section 9.
// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — Phases 6-7.
// Bridges the static query-universe-v1.json catalog + the PostgreSQL-backed
// mutable state to the exact shapes query-rotation-planner.ts and
// budget-policy.ts already expect (RotationQuery, BudgetState) -- neither
// of those pure, tested modules changes at all. This file is the only
// place that knows both "what a query looks like in the JSON" and "what a
// query looks like in the DB".
//
// Phase 6-7 redesign of hydration: the old hydrateRotationQueries loaded
// ALL 2718 rotation-state rows on every invocation via a single SELECT
// whose IN clause carried all 2718 query_ids in the request URL (>60KB) --
// the prime suspect in REAL-RUN-VALIDATION-2's platform timeout, and
// pointless work besides: a serverless run executes at most 5 queries.
// Key insight enabling an EXACT-parity fix (not an approximation): the
// Production seed created every row with defaults identical to the
// in-memory defaults hydrate already used for missing rows
// (last_executed_at=null, next_eligible_at=null, failure_count=0,
// discovery_yield=0). A default DB row and an absent DB row produce
// byte-identical RotationQuery hydration. Therefore only rows that have
// actually been MUTATED matter -- and every mutation path
// (markQueryExecuted via persistRotationUpdates) always sets
// last_executed_at. So loading only `WHERE last_executed_at IS NOT NULL`
// (currently 0 rows, grows by <= batch-size per run, paged and bounded)
// and defaulting everything else yields exactly the same hydrated
// universe as loading all 2718 rows -- proven by the parity test in
// scripts/scrapers/__tests__/openserp-db-call-timeout-safety.test.ts.
// The planner (selectNextBatch) then runs on the same full hydrated
// universe as before: identical inputs, identical selection.

import { sha256 } from "../utils";
import type { RotationQuery } from "../query-rotation-planner";
import { defaultBudgetState, type BudgetState, type EngineHealthState } from "../budget-policy";
import {
  loadExecutedQueryStates,
  loadQueryStates,
  upsertQueryStates,
  type OpenSerpEngineName,
  type QueryRotationDbState,
  type DbCallContext,
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
  ctx: DbCallContext = {},
): Promise<Array<T & RotationQuery>> {
  void universeVersion; // retained in the signature for call-site stability; seeding no longer happens here
  // Only mutated rows are fetched (see header comment) -- a fresh
  // Production universe loads 0 rows here instead of 2718.
  const executedStates = await loadExecutedQueryStates(ctx);

  return definitions.map((def) => {
    const state = executedStates.get(def.query_id);
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
// in the DB (no need to re-upsert every query on every run). The upsert
// creates the row if it doesn't exist yet (covers any environment where
// the seed was never applied), so dropping the hot-path seeding step in
// hydrateRotationQueries loses nothing.
export async function persistRotationUpdates(
  updated: ReadonlyArray<StaticQueryDefinition & RotationQuery & { succeeded?: boolean; engine?: OpenSerpEngineName }>,
  runId: string,
  universeVersion: string,
  ctx: DbCallContext = {},
): Promise<void> {
  if (updated.length === 0) return;

  // A plain PostgREST upsert replaces columns wholesale (no additive
  // merge), so the cumulative successful_run_count still needs the
  // previous value read first. This read is tiny and bounded: at most the
  // batch's own query_ids (1 per checkpoint call, <=5 per run), each call
  // wrapped in withDbTimeout -- nothing like the old full-universe load.
  const existing = await loadQueryStates(updated.map((q) => q.query_id), ctx);

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

  await upsertQueryStates(rows, runId, ctx);
}

export async function loadBudgetState(ctx: DbCallContext = {}): Promise<BudgetState> {
  const dbStates = await loadEngineBudgetStates(KNOWN_ENGINES, ctx);
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

export async function persistBudgetState(state: BudgetState, runId: string, ctx: DbCallContext = {}): Promise<void> {
  const existing = await loadEngineBudgetStates(KNOWN_ENGINES, ctx);
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

  await upsertEngineBudgetStates(rows, runId, ctx);
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
// the caller (e.g. the seed script or a future audit) to act on. Only
// mutated rows can carry a stale hash (default seeded rows were hashed at
// seed time from the same catalog), so checking executed rows suffices.
export async function verifyStateCompatibility(
  definitions: readonly StaticQueryDefinition[],
  universeVersion: string,
  ctx: DbCallContext = {},
): Promise<StateCompatibilityResult> {
  const states = await loadExecutedQueryStates(ctx);
  const mismatched: string[] = [];

  for (const def of definitions) {
    const state = states.get(def.query_id);
    if (!state) continue; // never mutated -- nothing to be stale
    const freshHash = hashQueryDefinition(def);
    if (state.query_definition_hash !== freshHash || state.query_universe_version !== universeVersion) {
      mismatched.push(def.query_id);
    }
  }

  return { compatible: mismatched.length === 0, mismatched_query_ids: mismatched };
}
