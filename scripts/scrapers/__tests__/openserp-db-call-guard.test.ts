// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — Phases 4-5 (unit) and
// Phase 8 (structural guard). Pure tests, no PGlite, no network. The one
// real-time wait in this file (the genuine-abort test) is ~1.5s -- the
// guard's hard floor -- never a production-scale wait.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  withDbTimeout,
  DbCallTimeoutError,
  TimeBudgetExhaustedBeforeDbCallError,
  setDbCallInstrumentationSink,
  MAX_DB_CALL_TIMEOUT_MS,
  MIN_VIABLE_DB_BUDGET_MS,
  type DbCallInstrumentation,
} from "../../../lib/openserp-ingestion/state/db-call-guard";
import { createTimeBudget } from "../../../lib/openserp-ingestion/time-budget";

test("fast call succeeds and is instrumented with duration + budget before/after", async () => {
  const entries: DbCallInstrumentation[] = [];
  setDbCallInstrumentationSink((e) => entries.push(e));
  try {
    let clock = 1_000_000;
    const now = () => clock;
    const budget = createTimeBudget({ routeMaxDurationMs: 120_000, safetyMarginMs: 20_000, now });

    const result = await withDbTimeout({
      callName: "unit_fast_call",
      timeBudget: budget,
      now,
      countRows: (r: number[]) => r.length,
      run: async () => {
        clock += 250; // simulated call duration
        return [1, 2, 3];
      },
    });

    assert.deepEqual(result, [1, 2, 3]);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].db_call_name, "unit_fast_call");
    assert.equal(entries[0].status, "success");
    assert.equal(entries[0].row_count, 3);
    assert.equal(entries[0].duration_ms, 250);
    assert.equal(entries[0].remaining_budget_ms_before, 100_000);
    assert.equal(entries[0].remaining_budget_ms_after, 99_750);
    assert.equal(entries[0].timeout, false);
  } finally {
    setDbCallInstrumentationSink(null);
  }
});

test("call refused outright when remaining budget is below the minimum (time_budget_exhausted_before_db_call)", async () => {
  const entries: DbCallInstrumentation[] = [];
  setDbCallInstrumentationSink((e) => entries.push(e));
  try {
    let clock = 0;
    const now = () => clock;
    const budget = createTimeBudget({ routeMaxDurationMs: 30_000, safetyMarginMs: 20_000, now });
    clock += 8_500; // 10s usable - 8.5s elapsed = 1500ms remaining < 2000ms minimum

    let runCalled = false;
    await assert.rejects(
      withDbTimeout({
        callName: "unit_refused_call",
        timeBudget: budget,
        now,
        run: async () => {
          runCalled = true;
          return null;
        },
      }),
      (error: unknown) => {
        assert.ok(error instanceof TimeBudgetExhaustedBeforeDbCallError);
        return true;
      },
    );
    assert.equal(runCalled, false, "the DB call must never start when refused");
    assert.equal(entries[0].status, "time_budget_exhausted_before_db_call");
  } finally {
    setDbCallInstrumentationSink(null);
  }
});

test("a genuinely slow call is REALLY aborted (signal fires, promise rejects, classified db_timeout)", async () => {
  const entries: DbCallInstrumentation[] = [];
  setDbCallInstrumentationSink((e) => entries.push(e));
  try {
    // remaining 2000ms (exactly the minimum, so not refused) -> effective
    // timeout = max(1000, min(8000, 2000-500)) = 1500ms.
    let clock = 0;
    const now = () => clock;
    const budget = createTimeBudget({ routeMaxDurationMs: 22_000, safetyMarginMs: 20_000, now });

    let sawAbort = false;
    await assert.rejects(
      withDbTimeout({
        callName: "unit_hanging_call",
        timeBudget: budget,
        now,
        run: (signal) =>
          new Promise((_resolve, reject) => {
            // Simulates a hanging network request that only ends when the
            // abort signal fires -- exactly how postgrest-js's fetch behaves
            // with .abortSignal().
            signal.addEventListener("abort", () => {
              sawAbort = true;
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      }),
      (error: unknown) => {
        assert.ok(error instanceof DbCallTimeoutError);
        return true;
      },
    );
    assert.equal(sawAbort, true, "the abort signal must actually fire inside the call -- not a fire-and-forget Promise.race");
    assert.equal(entries[0].status, "db_timeout");
    assert.equal(entries[0].aborted, true);
  } finally {
    setDbCallInstrumentationSink(null);
  }
});

test("a DB error that is NOT an abort is classified db_error, not db_timeout", async () => {
  const entries: DbCallInstrumentation[] = [];
  setDbCallInstrumentationSink((e) => entries.push(e));
  try {
    await assert.rejects(
      withDbTimeout({
        callName: "unit_erroring_call",
        run: async () => {
          throw new Error("relation does not exist");
        },
      }),
      /relation does not exist/,
    );
    assert.equal(entries[0].status, "db_error");
    assert.equal(entries[0].timeout, false);
  } finally {
    setDbCallInstrumentationSink(null);
  }
});

test("constants match the mission's mandated conservative values", () => {
  assert.equal(MAX_DB_CALL_TIMEOUT_MS, 8_000);
  assert.equal(MIN_VIABLE_DB_BUDGET_MS, 2_000);
});

test("instrumentation entries never contain secrets, URLs, snippets, or payloads (shape check)", async () => {
  const entries: DbCallInstrumentation[] = [];
  setDbCallInstrumentationSink((e) => entries.push(e));
  try {
    await withDbTimeout({ callName: "unit_shape_check", run: async () => ["https://secret.example/listing?token=abc"] });
    const allowedKeys = [
      "db_call_name", "started_at", "finished_at", "duration_ms", "row_count",
      "chunk_index", "remaining_budget_ms_before", "remaining_budget_ms_after",
      "status", "timeout", "aborted",
    ].sort();
    assert.deepEqual(Object.keys(entries[0]).sort(), allowedKeys, "instrumentation must carry ONLY the approved fields -- no payload/url/snippet field exists to leak into");
  } finally {
    setDbCallInstrumentationSink(null);
  }
});

// ---- Phase 8 structural guard ----

const STATE_FILES = [
  "lib/openserp-ingestion/state/query-rotation-state-repository.ts",
  "lib/openserp-ingestion/state/engine-budget-state-repository.ts",
  "lib/openserp-ingestion/state/ingestion-run-lock-repository.ts",
  "lib/openserp-ingestion/national-writer.ts",
];

test("structural guard: every Supabase call site in the ingestion path is wrapped (withDbTimeout imported, one .abortSignal per .from/.rpc call site)", () => {
  for (const file of STATE_FILES) {
    const content = readFileSync(join(process.cwd(), file), "utf8");
    assert.ok(content.includes("withDbTimeout"), `${file} must import/use withDbTimeout`);

    // Each real call site chains .abortSignal(signal). Comparing the count
    // of builder-creating calls (.from( / .rpc( on the supabase client,
    // whitespace/newline tolerant, single non-overlapping pattern) against
    // the count of .abortSignal( usages catches any newly added naked call
    // site.
    const abortSignals = (content.match(/\.abortSignal\(signal\)/g) ?? []).length;
    const builderStarts = (content.match(/supabase\s*\.\s*(?:from|rpc)\(/g) ?? []).length;
    assert.ok(builderStarts > 0, `${file} should contain at least one supabase call site`);
    assert.equal(
      abortSignals,
      builderStarts,
      `${file}: every supabase .from()/.rpc() call site (${builderStarts}) must chain exactly one .abortSignal(signal) (found ${abortSignals}) -- a missing one means an unbounded DB call was (re)introduced`,
    );
  }
});

test("structural guard: serverless-state-service.ts and run-orchestrator.ts never call the Supabase client directly (repositories only)", () => {
  for (const file of ["lib/openserp-ingestion/state/serverless-state-service.ts", "lib/openserp-ingestion/run-orchestrator.ts"]) {
    const content = readFileSync(join(process.cwd(), file), "utf8");
    assert.ok(!content.includes("getSupabaseServerClient"), `${file} must not obtain a raw Supabase client -- all DB access goes through the bounded repositories`);
  }
});
