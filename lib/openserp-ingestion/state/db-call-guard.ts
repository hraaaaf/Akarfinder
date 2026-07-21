// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — Phases 3-5.
// The single, central primitive every Supabase call in the ingestion path
// must go through. Root cause it exists for: run #10 of
// OPENSERP-SERVERLESS-STATE-REAL-RUN-VALIDATION-2 died at Vercel's hard
// 120s kill with zero application logs -- some DB call hung and nothing
// could interrupt it, because the internal time budget only measured
// elapsed time BETWEEN awaited calls, and no Supabase call carried any
// timeout or abort signal of its own (see
// docs/OPENSERP_SERVERLESS_DB_CALL_AUDIT.md, 15/15 calls unbounded).
//
// Design:
// - Real cancellation, not Promise.race: the AbortSignal is handed to
//   postgrest-js's own `.abortSignal()` (supported natively by
//   @supabase/supabase-js 2.x on every query and RPC builder), so the
//   underlying fetch is genuinely aborted -- the request does not keep
//   running in the background after the timeout fires.
// - Budget-aware: the effective per-call timeout is
//   min(MAX_DB_CALL_TIMEOUT_MS, remainingBudgetMs - DB_SAFETY_RESERVE_MS),
//   and if the remaining budget is below MIN_VIABLE_DB_BUDGET_MS the call
//   is refused outright (TimeBudgetExhaustedBeforeDbCallError) rather than
//   started with no realistic chance of finishing.
// - Instrumented: every call logs one structured line (name, duration,
//   remaining budget before/after, status) with NO secrets, URLs,
//   snippets, PII, or payloads -- so any future timeout names the exact
//   last call started.

import type { TimeBudget } from "../time-budget";
import { remainingBudgetMs } from "../time-budget";

// Conservative starting values per the mission order -- adjust only with
// test evidence, never arbitrarily.
export const MAX_DB_CALL_TIMEOUT_MS = 8_000;
export const MIN_VIABLE_DB_BUDGET_MS = 2_000;
// Kept from the per-engine-call design: never hand a call the entire
// remaining budget; leave room to persist/return after it finishes.
export const DB_SAFETY_RESERVE_MS = 500;

export type DbCallStatus = "success" | "db_timeout" | "db_error" | "time_budget_exhausted_before_db_call";

export class DbCallTimeoutError extends Error {
  readonly callName: string;
  constructor(callName: string, timeoutMs: number) {
    super(`DB call "${callName}" timed out after ${timeoutMs}ms`);
    this.name = "DbCallTimeoutError";
    this.callName = callName;
  }
}

export class TimeBudgetExhaustedBeforeDbCallError extends Error {
  readonly callName: string;
  constructor(callName: string, remainingMs: number) {
    super(`DB call "${callName}" refused: only ${remainingMs}ms of budget left (< ${MIN_VIABLE_DB_BUDGET_MS}ms minimum)`);
    this.name = "TimeBudgetExhaustedBeforeDbCallError";
    this.callName = callName;
  }
}

export type DbCallInstrumentation = {
  db_call_name: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  row_count: number | null;
  chunk_index: number | null;
  remaining_budget_ms_before: number | null;
  remaining_budget_ms_after: number | null;
  status: DbCallStatus;
  timeout: boolean;
  aborted: boolean;
};

type InstrumentationSink = (entry: DbCallInstrumentation) => void;

// Default sink: one structured console line per call (visible in Vercel
// function logs). Callers/tests can swap it (e.g. to collect entries).
let instrumentationSink: InstrumentationSink = (entry) => {
  console.log(`[db-call] ${JSON.stringify(entry)}`);
};

export function setDbCallInstrumentationSink(sink: InstrumentationSink | null): void {
  instrumentationSink = sink ?? ((entry) => console.log(`[db-call] ${JSON.stringify(entry)}`));
}

export type WithDbTimeoutInput<T> = {
  callName: string;
  // The actual DB call. MUST wire the provided signal into the builder via
  // .abortSignal(signal) (or the RPC equivalent) -- passing it is what
  // makes the timeout a real network abort instead of a fire-and-forget.
  run: (signal: AbortSignal) => Promise<T>;
  // Optional row count extractor for instrumentation.
  countRows?: (result: T) => number | null;
  // When present, the call becomes budget-aware: refused below the
  // minimum, and its timeout shrinks to fit what's left. When absent
  // (e.g. local CLI usage with no serverless deadline), the flat
  // MAX_DB_CALL_TIMEOUT_MS applies alone.
  timeBudget?: TimeBudget;
  now?: () => number;
  chunkIndex?: number;
};

export async function withDbTimeout<T>(input: WithDbTimeoutInput<T>): Promise<T> {
  const now = input.now ?? Date.now;
  const startedAtMs = now();
  const remainingBefore = input.timeBudget ? remainingBudgetMs(input.timeBudget, now) : null;

  const record = (status: DbCallStatus, rowCount: number | null, timedOut: boolean): void => {
    const finishedAtMs = now();
    instrumentationSink({
      db_call_name: input.callName,
      started_at: new Date(startedAtMs).toISOString(),
      finished_at: new Date(finishedAtMs).toISOString(),
      duration_ms: finishedAtMs - startedAtMs,
      row_count: rowCount,
      chunk_index: input.chunkIndex ?? null,
      remaining_budget_ms_before: remainingBefore,
      remaining_budget_ms_after: input.timeBudget ? remainingBudgetMs(input.timeBudget, now) : null,
      status,
      timeout: timedOut,
      aborted: timedOut,
    });
  };

  if (remainingBefore !== null && remainingBefore < MIN_VIABLE_DB_BUDGET_MS) {
    record("time_budget_exhausted_before_db_call", null, false);
    throw new TimeBudgetExhaustedBeforeDbCallError(input.callName, remainingBefore);
  }

  const timeoutMs =
    remainingBefore !== null
      ? Math.max(1_000, Math.min(MAX_DB_CALL_TIMEOUT_MS, remainingBefore - DB_SAFETY_RESERVE_MS))
      : MAX_DB_CALL_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await input.run(controller.signal);
    record("success", input.countRows ? input.countRows(result) : null, false);
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      record("db_timeout", null, true);
      throw new DbCallTimeoutError(input.callName, timeoutMs);
    }
    record("db_error", null, false);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
