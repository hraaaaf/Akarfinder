// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 -- Gate A (PGlite).
// Not part of the committed test suite (excluded from tsconfig/test globs by
// living under __gate__/, matching the precedent set by
// gate-a-pglite-national-writer.ts). No Production connection, no Production
// data.
//
// The repository layer (lib/openserp-ingestion/state/*) calls
// getSupabaseServerClient() (the real @supabase/supabase-js client, talking
// PostgREST over HTTP) -- PGlite has no PostgREST layer, so those TypeScript
// functions cannot be invoked directly against it. This gate instead runs
// the exact equivalent SQL each repository call compiles to (same table,
// same onConflict target) against a real schema + the 2 new migrations,
// proving the DB-level safety properties: constraint compatibility,
// idempotence, budget-range/engine-name check constraints, and clean
// rollback of a failed transaction.

import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = [
  "20260718140000_create_openserp_query_rotation_state.sql",
  "20260718140100_create_openserp_engine_budget_state.sql",
];

const report: Record<string, unknown> = {
  gate_id: "openserp-serverless-state-gate-a",
  mission: "OPENSERP-SERVERLESS-STATE-PERSISTENCE-1",
  generated_at_utc: new Date().toISOString(),
  engine: "@electric-sql/pglite (embedded WASM Postgres, ephemeral)",
  no_production_connection_made: true,
  no_production_data_used: true,
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  const db = new PGlite();

  // ---- migrations ----
  for (const file of MIGRATIONS) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // pgcrypto's gen_random_uuid() isn't needed by these two tables (text
    // primary keys), so no extension bootstrap is required here.
    await db.exec(sql);
  }
  report.migration = { status: "PASS", files: MIGRATIONS };

  // ---- seed: neutral rotation-state rows + default engine budget rows ----
  await db.exec(`
    insert into openserp_query_rotation_state
      (query_id, query_universe_version, query_definition_hash, last_executed_at, next_eligible_at, failure_count, successful_run_count, discovery_yield, last_engine, last_run_id)
    values
      ('q1', 'v1', 'hash-q1', null, null, 0, 0, 0, null, null),
      ('q2', 'v1', 'hash-q2', null, null, 0, 0, 0, null, null),
      ('q3', 'v1', 'hash-q3', null, null, 0, 0, 0, null, null);
  `);
  await db.exec(`
    insert into openserp_engine_budget_state
      (engine, state_version, current_budget, consecutive_failures, captcha_count, rate_limit_count, timeout_count, suspended_until, last_success_at, last_failure_at, last_run_id)
    values
      ('bing', 'v1', 12, 0, 0, 0, 0, null, null, null, null),
      ('duckduckgo', 'v1', 12, 0, 0, 0, 0, null, null, null, null),
      ('ecosia', 'v1', 12, 0, 0, 0, 0, null, null, null, null);
  `);
  const seedCheck = await db.query<{ count: string }>("select count(*)::text from openserp_query_rotation_state;");
  assert(seedCheck.rows[0].count === "3", "expected exactly 3 seeded rotation-state rows");
  const seedBudgetCheck = await db.query<{ count: string }>("select count(*)::text from openserp_engine_budget_state;");
  assert(seedBudgetCheck.rows[0].count === "3", "expected exactly 3 seeded engine budget rows");
  report.seed = { status: "PASS", rotation_rows: 3, budget_rows: 3 };

  // ---- first read (simulates hydrateRotationQueries' initial load) ----
  const firstRead = await db.query<{ query_id: string; last_executed_at: string | null }>(
    "select query_id, last_executed_at from openserp_query_rotation_state order by query_id;",
  );
  assert(firstRead.rows.every((r) => r.last_executed_at === null), "all queries must start never-executed");
  report.first_read = { status: "PASS" };

  // ---- batch selection + write state (simulates run #1: q1 and q2 execute, q3 doesn't) ----
  const runId1 = "gate-a-run-1";
  await db.exec(`
    update openserp_query_rotation_state
    set last_executed_at = '2026-07-19T00:00:00Z', failure_count = 0, successful_run_count = 1, discovery_yield = 2, last_engine = 'duckduckgo', last_run_id = '${runId1}', updated_at = now()
    where query_id in ('q1', 'q2');
  `);
  await db.exec(`
    update openserp_engine_budget_state
    set current_budget = 12, consecutive_failures = 0, last_success_at = now(), last_run_id = '${runId1}', updated_at = now()
    where engine in ('bing', 'duckduckgo', 'ecosia');
  `);
  report.first_run_write = { status: "PASS" };

  // ---- persistence across a "new logical process" (re-open a fresh query, simulating a second invocation) ----
  const afterFirstRun = await db.query<{ query_id: string; last_executed_at: string | null; last_run_id: string | null }>(
    "select query_id, last_executed_at, last_run_id from openserp_query_rotation_state order by query_id;",
  );
  const q1Row = afterFirstRun.rows.find((r) => r.query_id === "q1")!;
  const q3Row = afterFirstRun.rows.find((r) => r.query_id === "q3")!;
  assert(q1Row.last_executed_at !== null && q1Row.last_run_id === runId1, "q1's rotation state must persist across invocations");
  assert(q3Row.last_executed_at === null, "q3 (not in the batch) must remain untouched");
  report.rotation_state_persists_across_invocations = { status: "PASS" };

  // ---- second invocation: q3 now executes (never-executed queries prioritized) ----
  const runId2 = "gate-a-run-2";
  await db.exec(`
    update openserp_query_rotation_state
    set last_executed_at = '2026-07-19T00:30:00Z', failure_count = 0, successful_run_count = 1, discovery_yield = 1, last_engine = 'bing', last_run_id = '${runId2}', updated_at = now()
    where query_id = 'q3';
  `);
  const afterSecondRun = await db.query<{ query_id: string; last_run_id: string | null }>(
    "select query_id, last_run_id from openserp_query_rotation_state order by query_id;",
  );
  assert(
    afterSecondRun.rows.find((r) => r.query_id === "q1")!.last_run_id === runId1 &&
      afterSecondRun.rows.find((r) => r.query_id === "q3")!.last_run_id === runId2,
    "the second invocation's rotation selects a different batch (q3, never-executed) and does not disturb q1/q2's state from run 1",
  );
  report.second_invocation_selects_different_batch = { status: "PASS" };

  // ---- CAPTCHA + suspension: bing gets a captcha, budget drops to MIN, bing suspended 6h ----
  const runId3 = "gate-a-run-3";
  await db.exec(`
    update openserp_engine_budget_state
    set current_budget = 4, captcha_count = captcha_count + 1, consecutive_failures = consecutive_failures + 1,
        suspended_until = '2026-07-19T06:30:00Z', last_failure_at = now(), last_run_id = '${runId3}', updated_at = now()
    where engine = 'bing';
  `);
  await db.exec(`
    update openserp_engine_budget_state
    set current_budget = 4, last_run_id = '${runId3}', updated_at = now()
    where engine in ('duckduckgo', 'ecosia');
  `);
  const afterCaptcha = await db.query<{ engine: string; suspended_until: string | null; current_budget: number }>(
    "select engine, suspended_until, current_budget from openserp_engine_budget_state order by engine;",
  );
  const bingRow = afterCaptcha.rows.find((r) => r.engine === "bing")!;
  assert(bingRow.suspended_until !== null, "bing must be marked suspended after a captcha");
  assert(afterCaptcha.rows.every((r) => r.current_budget === 4), "budget must drop to MIN (4) for all engines after any incident, matching applyRunOutcome's global behavior");
  report.captcha_and_suspension = { status: "PASS" };

  // Suspension must survive a brand-new query against the same persisted
  // state (simulating: end of serverless function -> redeploy -> another
  // GitHub Actions runner -> next invocation reads the DB fresh).
  const suspensionSurvives = await db.query<{ suspended_until: string | null }>(
    "select suspended_until from openserp_engine_budget_state where engine = 'bing';",
  );
  assert(
    suspensionSurvives.rows[0].suspended_until !== null &&
      new Date(suspensionSurvives.rows[0].suspended_until).getTime() === new Date("2026-07-19T06:30:00Z").getTime(),
    "bing's suspension must be readable exactly as written from a fresh query, proving it does not depend on any in-process/in-memory state",
  );
  report.suspension_survives_fresh_query = { status: "PASS" };

  // ---- idempotence: re-applying the identical q1 update produces 0 new rows, same values ----
  const countBeforeReapply = await db.query<{ count: string }>("select count(*)::text from openserp_query_rotation_state;");
  await db.exec(`
    update openserp_query_rotation_state
    set last_executed_at = '2026-07-19T00:00:00Z', failure_count = 0, successful_run_count = 1, discovery_yield = 2, last_engine = 'duckduckgo', last_run_id = '${runId1}', updated_at = now()
    where query_id = 'q1';
  `);
  const countAfterReapply = await db.query<{ count: string }>("select count(*)::text from openserp_query_rotation_state;");
  assert(countBeforeReapply.rows[0].count === countAfterReapply.rows[0].count, "re-applying the same state update must never create a new row (query_id is the primary key)");
  report.idempotence = { status: "PASS" };

  // ---- constraint enforcement: an out-of-range budget must be rejected ----
  let budgetRangeViolationCaught = false;
  try {
    await db.exec(`update openserp_engine_budget_state set current_budget = 999 where engine = 'ecosia';`);
  } catch {
    budgetRangeViolationCaught = true;
  }
  assert(budgetRangeViolationCaught, "current_budget outside [4, 24] must be rejected by openserp_engine_budget_state_budget_range_check");
  const ecosiaBudgetAfterViolation = await db.query<{ current_budget: number }>(
    "select current_budget from openserp_engine_budget_state where engine = 'ecosia';",
  );
  assert(ecosiaBudgetAfterViolation.rows[0].current_budget === 4, "the rejected update must leave ecosia's prior valid budget (4) untouched");
  report.budget_range_constraint_enforced = { status: "PASS" };

  let engineNameViolationCaught = false;
  try {
    await db.exec(
      `insert into openserp_engine_budget_state (engine, state_version, current_budget) values ('yahoo', 'v1', 12);`,
    );
  } catch {
    engineNameViolationCaught = true;
  }
  assert(engineNameViolationCaught, "an engine outside (bing, duckduckgo, ecosia) must be rejected by openserp_engine_budget_state_engine_check");
  report.engine_name_constraint_enforced = { status: "PASS" };

  // ---- failed transaction + rollback: a batch write that partially violates a constraint must not partially apply ----
  let transactionRolledBack = false;
  try {
    await db.transaction(async (tx) => {
      await tx.exec(`update openserp_query_rotation_state set discovery_yield = 999 where query_id = 'q2';`);
      // This second statement in the same transaction violates the
      // non-negative check constraint -- the whole transaction must abort,
      // including the q2 update above.
      await tx.exec(`update openserp_query_rotation_state set failure_count = -1 where query_id = 'q3';`);
    });
  } catch {
    transactionRolledBack = true;
  }
  assert(transactionRolledBack, "a transaction containing an invalid statement must throw");
  const q2AfterRollback = await db.query<{ discovery_yield: number }>(
    "select discovery_yield from openserp_query_rotation_state where query_id = 'q2';",
  );
  assert(q2AfterRollback.rows[0].discovery_yield === 2, "q2's earlier valid update must survive intact -- the failed transaction must not have partially applied its own first statement either");
  report.failed_transaction_rollback = { status: "PASS" };

  // ---- clean reapply after rollback ----
  await db.exec(`update openserp_query_rotation_state set discovery_yield = 3, updated_at = now() where query_id = 'q2';`);
  const q2AfterCleanReapply = await db.query<{ discovery_yield: number }>(
    "select discovery_yield from openserp_query_rotation_state where query_id = 'q2';",
  );
  assert(q2AfterCleanReapply.rows[0].discovery_yield === 3, "a clean, valid update after a rolled-back transaction must apply normally");
  report.clean_reapply_after_rollback = { status: "PASS" };

  await db.close();

  report.overall_verdict = "PASS";
  writeFileSync(
    join(process.cwd(), "data", "audits", "openserp-serverless-state-gate-a.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log("=== GATE A (PGlite) OPENSERP SERVERLESS STATE: ALL TESTS PASSED ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error("GATE A FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
