// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — section 9.
// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — Phases 4-6.
// Persists the mutable rotation-state half of each query (everything
// query-rotation-planner.ts's markQueryExecuted() would otherwise have
// written back into the local query-universe-v1.json file). The static
// query_definition half stays in the JSON catalog, read-only, forever.
//
// No fallback to a filesystem write anywhere in this file, by design --
// if the DB call fails, the caller sees the error and the run fails loudly
// rather than silently degrading to a non-durable local write.
//
// Every call goes through withDbTimeout (real .abortSignal() cancellation,
// budget-aware refusal, structured instrumentation) -- the unbounded
// 2718-id single-IN-clause SELECT here was the prime suspect in the
// REAL-RUN-VALIDATION-2 platform timeout (see
// docs/OPENSERP_SERVERLESS_DB_CALL_AUDIT.md call #2). Large id sets are
// now chunked (DB_IN_CLAUSE_CHUNK_SIZE), each chunk carrying its own
// timeout and budget check.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { withDbTimeout } from "./db-call-guard";
import type { TimeBudget } from "../time-budget";

export type OpenSerpEngineName = "bing" | "duckduckgo" | "ecosia";

// 200 ids per chunk keeps each PostgREST request's URL comfortably small
// (~5KB of id list vs >60KB for 2718 at once) and each response bounded,
// while needing at most ceil(2718/200)=14 chunks even for a full-universe
// hydration -- and the serverless path no longer does full-universe
// hydration at all (see serverless-state-service.ts Phase 7 changes).
export const DB_IN_CLAUSE_CHUNK_SIZE = 200;

export type QueryRotationDbState = {
  query_id: string;
  query_universe_version: string;
  query_definition_hash: string;
  last_executed_at: string | null;
  next_eligible_at: string | null;
  failure_count: number;
  successful_run_count: number;
  discovery_yield: number;
  last_engine: OpenSerpEngineName | null;
  last_run_id: string | null;
};

export type QueryDefinitionForSeed = {
  query_id: string;
  query_universe_version: string;
  query_definition_hash: string;
};

export type DbCallContext = {
  timeBudget?: TimeBudget;
  now?: () => number;
};

function chunk<T>(values: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size) as T[]);
  return out;
}

export async function loadQueryStates(queryIds: string[], ctx: DbCallContext = {}): Promise<Map<string, QueryRotationDbState>> {
  const map = new Map<string, QueryRotationDbState>();
  if (queryIds.length === 0) return map;

  const supabase = getSupabaseServerClient();
  const chunks = chunk(queryIds, DB_IN_CLAUSE_CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i += 1) {
    const rows = await withDbTimeout({
      callName: "load_query_states",
      chunkIndex: chunks.length > 1 ? i : undefined,
      timeBudget: ctx.timeBudget,
      now: ctx.now,
      countRows: (r: QueryRotationDbState[]) => r.length,
      run: async (signal) => {
        const { data, error } = await supabase
          .from("openserp_query_rotation_state")
          .select(
            "query_id, query_universe_version, query_definition_hash, last_executed_at, next_eligible_at, failure_count, successful_run_count, discovery_yield, last_engine, last_run_id",
          )
          .in("query_id", chunks[i])
          .abortSignal(signal);
        if (error) throw new Error(`loadQueryStates failed: ${error.message}`);
        return (data ?? []) as QueryRotationDbState[];
      },
    });
    for (const row of rows) map.set(row.query_id, row);
  }
  return map;
}

// Loads ONLY rotation-state rows that have actually been mutated by a run
// (last_executed_at set -- every mutation path sets it, see
// serverless-state-service.ts's parity argument). On a fresh universe
// this returns 0 rows instead of 2718; it grows by at most the batch size
// per run and is hard-capped at the universe size, paged in bounded
// chunks so no single request can balloon. Each page carries its own
// timeout + budget check.
export const EXECUTED_STATES_PAGE_SIZE = 1000;

export async function loadExecutedQueryStates(ctx: DbCallContext = {}): Promise<Map<string, QueryRotationDbState>> {
  const supabase = getSupabaseServerClient();
  const map = new Map<string, QueryRotationDbState>();

  for (let page = 0; ; page += 1) {
    const rows = await withDbTimeout({
      callName: "load_executed_query_states",
      chunkIndex: page > 0 ? page : undefined,
      timeBudget: ctx.timeBudget,
      now: ctx.now,
      countRows: (r: QueryRotationDbState[]) => r.length,
      run: async (signal) => {
        const { data, error } = await supabase
          .from("openserp_query_rotation_state")
          .select(
            "query_id, query_universe_version, query_definition_hash, last_executed_at, next_eligible_at, failure_count, successful_run_count, discovery_yield, last_engine, last_run_id",
          )
          .not("last_executed_at", "is", null)
          .order("query_id", { ascending: true })
          .range(page * EXECUTED_STATES_PAGE_SIZE, (page + 1) * EXECUTED_STATES_PAGE_SIZE - 1)
          .abortSignal(signal);
        if (error) throw new Error(`loadExecutedQueryStates failed: ${error.message}`);
        return (data ?? []) as QueryRotationDbState[];
      },
    });
    for (const row of rows) map.set(row.query_id, row);
    if (rows.length < EXECUTED_STATES_PAGE_SIZE) break;
  }
  return map;
}

export async function upsertQueryStates(states: QueryRotationDbState[], runId: string, ctx: DbCallContext = {}): Promise<void> {
  if (states.length === 0) return;

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = states.map((state) => ({
    ...state,
    last_run_id: runId,
    updated_at: now,
  }));

  await withDbTimeout({
    callName: "upsert_query_states",
    timeBudget: ctx.timeBudget,
    now: ctx.now,
    countRows: () => rows.length,
    run: async (signal) => {
      const { error } = await supabase
        .from("openserp_query_rotation_state")
        .upsert(rows, { onConflict: "query_id" })
        .abortSignal(signal);
      if (error) throw new Error(`upsertQueryStates failed: ${error.message}`);
      return rows;
    },
  });
}

// Lazily creates a neutral (never-executed) rotation-state row for any
// query_id present in the static universe but not yet in the DB -- covers
// both the initial seed and any future universe growth (new queries added
// to query-universe-v1.json after the first seed) without a separate
// migration step each time. Chunked on both the read and the write side.
export async function seedMissingQueryStates(definitions: QueryDefinitionForSeed[], ctx: DbCallContext = {}): Promise<{ seeded: number }> {
  if (definitions.length === 0) return { seeded: 0 };

  const existing = await loadQueryStates(definitions.map((d) => d.query_id), ctx);
  const missing = definitions.filter((d) => !existing.has(d.query_id));
  if (missing.length === 0) return { seeded: 0 };

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const allRows = missing.map((d) => ({
    query_id: d.query_id,
    query_universe_version: d.query_universe_version,
    query_definition_hash: d.query_definition_hash,
    last_executed_at: null,
    next_eligible_at: null,
    failure_count: 0,
    successful_run_count: 0,
    discovery_yield: 0,
    last_engine: null,
    last_run_id: null,
    created_at: now,
    updated_at: now,
  }));

  const rowChunks = chunk(allRows, DB_IN_CLAUSE_CHUNK_SIZE);
  for (let i = 0; i < rowChunks.length; i += 1) {
    await withDbTimeout({
      callName: "seed_missing_query_states",
      chunkIndex: rowChunks.length > 1 ? i : undefined,
      timeBudget: ctx.timeBudget,
      now: ctx.now,
      countRows: () => rowChunks[i].length,
      run: async (signal) => {
        // onConflict + ignoreDuplicates guards against a race with another
        // concurrent invocation seeding the same missing rows between the
        // loadQueryStates check above and this insert.
        const { error } = await supabase
          .from("openserp_query_rotation_state")
          .upsert(rowChunks[i], { onConflict: "query_id", ignoreDuplicates: true })
          .abortSignal(signal);
        if (error) throw new Error(`seedMissingQueryStates failed: ${error.message}`);
        return rowChunks[i];
      },
    });
  }
  return { seeded: allRows.length };
}
