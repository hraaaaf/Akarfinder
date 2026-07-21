// OPENSERP-ENGINE-BUDGET-LAST-SUCCESS-SEMANTICS-1
// Proves persistBudgetState's last_success_at now advances only when the
// engine actually had >=1 real successful engine call this run (passed in
// as enginesWithSuccessThisRun), never merely because the engine isn't
// suspended -- the bug found by reading a real GitHub dry-run's Production
// rows: all 3 engines got last_success_at bumped to "now" despite the run
// having 0 real successes on 2 of them. Same PGlite-backed fake-Supabase
// harness as the other state-persistence integration tests. Run via the
// dedicated `test:openserp-time-budget-and-lock-safety` npm script
// (requires --experimental-test-module-mocks).

import { test, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultBudgetState, type BudgetState } from "../../../lib/openserp-ingestion/budget-policy";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = ["20260718140100_create_openserp_engine_budget_state.sql"];

let db: InstanceType<typeof PGlite>;

before(async () => {
  db = new PGlite();
  await db.exec("create role service_role;");
  for (const file of MIGRATIONS) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  const { makeFakeSupabaseClient } = await import("./helpers/fake-supabase-postgrest");
  mock.module("@/lib/db/supabase-client", {
    namedExports: { getSupabaseServerClient: () => makeFakeSupabaseClient(db, () => 0) },
  });
});

beforeEach(async () => {
  await db.exec("delete from openserp_engine_budget_state;");
});

after(() => {
  mock.reset();
});

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

async function readEngineRow(engine: string): Promise<{ last_success_at: string | null; suspended_until: string | null }> {
  const result = await db.query<{ last_success_at: string | Date | null; suspended_until: string | Date | null }>(
    `select last_success_at, suspended_until from openserp_engine_budget_state where engine = '${engine}';`,
  );
  const row = result.rows[0];
  return { last_success_at: toIso(row?.last_success_at), suspended_until: toIso(row?.suspended_until) };
}

test("1. real success -> last_success_at advances", async () => {
  const { persistBudgetState } = await import("../../../lib/openserp-ingestion/state/serverless-state-service");
  const state: BudgetState = defaultBudgetState();

  const before = new Date().toISOString();
  await persistBudgetState(state, "run-1-success", {}, new Set(["bing"]));
  const after = new Date().toISOString();

  const row = await readEngineRow("bing");
  assert.ok(row.last_success_at !== null, "last_success_at should be set after a real success");
  assert.ok(row.last_success_at! >= before && row.last_success_at! <= after, "last_success_at should be a fresh timestamp");
});

test("2. 100% failure -> last_success_at stays unchanged", async () => {
  const { persistBudgetState } = await import("../../../lib/openserp-ingestion/state/serverless-state-service");
  const state: BudgetState = defaultBudgetState();

  // Seed a prior known-good success, then run again with zero successes on
  // every engine (the exact shape of the real dry-run that surfaced this
  // bug: 100% engine-call failures, engine not suspended).
  await persistBudgetState(state, "run-2-seed", {}, new Set(["duckduckgo"]));
  const seeded = await readEngineRow("duckduckgo");
  assert.ok(seeded.last_success_at !== null);

  await persistBudgetState(state, "run-2-all-fail", {}, new Set());
  const after = await readEngineRow("duckduckgo");

  assert.equal(after.last_success_at, seeded.last_success_at, "last_success_at must not advance when this run had zero real successes");
});

test("3. success then failure -> keeps the last real success, doesn't null it or advance it", async () => {
  const { persistBudgetState } = await import("../../../lib/openserp-ingestion/state/serverless-state-service");
  const state: BudgetState = defaultBudgetState();

  await persistBudgetState(state, "run-3-success", {}, new Set(["ecosia"]));
  const afterSuccess = await readEngineRow("ecosia");
  assert.ok(afterSuccess.last_success_at !== null);

  // A subsequent run where ecosia fails every attempt (0 successes this
  // run) must neither null out the earlier success nor pretend a new one
  // just happened.
  await persistBudgetState(state, "run-3-failure", {}, new Set());
  const afterFailure = await readEngineRow("ecosia");

  assert.equal(afterFailure.last_success_at, afterSuccess.last_success_at);
});

test("4. suspension with zero successes never fabricates a success", async () => {
  const { persistBudgetState } = await import("../../../lib/openserp-ingestion/state/serverless-state-service");
  const state: BudgetState = defaultBudgetState();
  // bing gets suspended this run (e.g. a captcha/rate-limit incident) --
  // budget-policy.ts's own applyRunOutcome is what actually sets this in
  // production; this test constructs the resulting state directly to
  // isolate persistBudgetState's own behavior.
  const suspendedUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  state.engines = state.engines.map((e) => (e.engine === "bing" ? { ...e, suspended_until: suspendedUntil, consecutive_clean_runs: 0 } : e));

  await persistBudgetState(state, "run-4-suspend", {}, new Set());

  const row = await readEngineRow("bing");
  assert.equal(row.last_success_at, null, "a suspension with zero real successes must never set last_success_at");
  assert.equal(row.suspended_until, suspendedUntil);
});
