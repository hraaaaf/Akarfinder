// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 9 (items 6-14,
// 17-18) and Phase 10 (local controlled simulation). Run via the dedicated
// `test:openserp-time-budget-and-lock-safety` npm script (requires
// --experimental-test-module-mocks -- kept out of the shared test:scrapers
// invocation so that flag doesn't need to apply to every other test file).
//
// Calls the REAL, unmodified runIngestionCycle() -- not a mock of the
// orchestrator. Three external boundaries are substituted, each disclosed:
//   1. @/lib/db/supabase-client -- PGlite-backed adapter (real SQL, real
//      migrations, including the new lease-lock table + its 2 Postgres
//      functions) instead of a real network Postgres/PostgREST.
//   2. @/lib/openserp-ingestion/openserp-live -- deterministic fake engines
//      (fast / slow / erroring), no real network call, ever.
//   3. @/lib/openserp-ingestion/national-writer -- no-op, proving
//      reachability without any real listing write.
//
// Tests run in file-definition order (node:test's default, no
// `concurrency`) because later scenarios deliberately build on earlier
// ones' persisted state (e.g. "resume at next run" depends on "sufficient
// budget completes" having already run) -- this mirrors a real serverless
// deployment's own cross-invocation state dependency, which is exactly
// the property under test.

import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1: the repositories now chain
// .abortSignal()/.not()/.order()/.range() on every builder, so this file's
// old minimal inline client no longer matches the real call surface --
// replaced by the shared, fuller PGlite-backed helper.
import { makeFakeSupabaseClient } from "./helpers/fake-supabase-postgrest";
import { MAX_SERVERLESS_BATCH_SIZE } from "../../../lib/openserp-ingestion/budget-policy";

const ROTATION_MIGRATION = "20260718140000_create_openserp_query_rotation_state.sql";
const BUDGET_MIGRATION = "20260718140100_create_openserp_engine_budget_state.sql";
const LOCK_MIGRATION = "20260718180000_create_openserp_ingestion_run_lock.sql";
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

type FakeEngineBehavior = { kind: "success" } | { kind: "timeout" } | { kind: "error" };

let db: InstanceType<typeof PGlite>;
let fakeClock = 1_700_000_000_000;
const now = () => fakeClock;
let writerCalls = 0;
const engineBehaviors = new Map<string, FakeEngineBehavior>();

class FakeEngineCallError extends Error {
  outcome: string;
  constructor(message: string, outcome: string) {
    super(message);
    this.name = "EngineCallError";
    this.outcome = outcome;
  }
}

function writeFixture(queryIds: Array<{ id: string; queryText: string; city?: string }>): string {
  const universe = {
    universe_version: `fixture-${queryIds[0]?.id ?? "empty"}`,
    queries: queryIds.map(({ id, queryText, city }) => ({
      query_id: id,
      city: city ?? "Casablanca",
      district: null,
      priority_tier: 1 as const,
      transaction: "sale" as const,
      property_type: "appartement",
      language: "fr" as const,
      preferred_engine: "duckduckgo" as const,
      query_text: queryText,
      target_domain: null,
      query_family: "general" as const,
    })),
  };
  const path = join(tmpdir(), `openserp-time-budget-integration-${id_counter++}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(universe), "utf8");
  return path;
}
let id_counter = 0;

before(async () => {
  db = new PGlite();
  // The lock migration's `grant execute ... to service_role` requires this
  // role to exist -- PGlite ships without Supabase's role model, unlike a
  // real Supabase/Postgres instance where it's always present.
  await db.exec("create role service_role;");
  for (const file of [ROTATION_MIGRATION, BUDGET_MIGRATION, LOCK_MIGRATION]) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  mock.module("@/lib/db/supabase-client", { namedExports: { getSupabaseServerClient: () => makeFakeSupabaseClient(db) } });
  mock.module("@/lib/openserp-ingestion/openserp-live", {
    namedExports: {
      DEFAULT_ENGINE_CALL_TIMEOUT_MS: 15_000,
      EngineCallError: FakeEngineCallError,
      runOpenSerpLiveQuery: async (input: { engine: string; query: string }) => {
        const behavior = engineBehaviors.get(input.query) ?? { kind: "success" };
        if (behavior.kind === "timeout") {
          fakeClock += 20_000; // simulate a slow call that consumes the whole remaining budget
          throw new FakeEngineCallError(`engine ${input.engine} timed out`, "engine_timeout");
        }
        if (behavior.kind === "error") {
          throw new FakeEngineCallError(`engine ${input.engine} network error`, "network_error");
        }
        fakeClock += 200; // simulate a normal fast call
        return {
          response: { engine: input.engine, query: input.query, results: [], fetched_at: new Date(fakeClock).toISOString(), provider: "fixture" },
          provider: { provider: "fixture", provider_mode: "test_fixture", provider_endpoint: "n/a", provider_live_or_fixture: "fixture" },
        };
      },
    },
  });
  mock.module("@/lib/openserp-ingestion/national-writer", {
    namedExports: {
      writeNationalIngestionRun: async () => {
        writerCalls += 1;
        return {
          discovery_candidates_written: 0, discovery_candidates_accepted: 0, discovery_candidates_rejected: 0,
          discovery_candidates_unclassified: 0, new_property_listings: 0, updated_property_listings: 0,
          new_listing_sources: 0, updated_listing_sources: 0, new_clusters: 0, new_memberships: 0,
          multi_source_clusters_created: 0, observations_created: 0, write_errors: [],
        };
      },
    },
  });
});

after(async () => {
  mock.reset();
});

test("item 9: fresh lock acquire succeeds", async () => {
  const { acquireIngestionRunLock } = await import("../../../lib/openserp-ingestion/state/ingestion-run-lock-repository");
  const r = await acquireIngestionRunLock("owner-a", 60);
  assert.equal(r.acquired, true);
});

test("item 10: a second acquire while the first is still active is refused", async () => {
  const { acquireIngestionRunLock } = await import("../../../lib/openserp-ingestion/state/ingestion-run-lock-repository");
  const r = await acquireIngestionRunLock("owner-b", 60);
  assert.equal(r.acquired, false);
});

test("item 12: an owner that never held the lock cannot delete it", async () => {
  const { releaseIngestionRunLock } = await import("../../../lib/openserp-ingestion/state/ingestion-run-lock-repository");
  const released = await releaseIngestionRunLock("owner-b");
  assert.equal(released, false);
  const row = await db.query<{ owner_id: string }>("select owner_id from openserp_ingestion_run_lock where lock_name = 'openserp-ingestion';");
  assert.equal(row.rows[0].owner_id, "owner-a");
});

test("item 11/13: an expired lease is atomically taken over by a new owner (simulates recovery after a platform kill, no manual cleanup)", async () => {
  const { acquireIngestionRunLock } = await import("../../../lib/openserp-ingestion/state/ingestion-run-lock-repository");
  // Backdate the lease to already-expired -- simulates a killed
  // invocation whose `finally` never ran, with zero real waiting.
  await db.query("update openserp_ingestion_run_lock set expires_at = now() - interval '1 minute' where lock_name = 'openserp-ingestion';");
  const r = await acquireIngestionRunLock("owner-c", 60);
  assert.equal(r.acquired, true);
});

test("the pre-expiry owner cannot release the new owner's lease, but the new owner can release cleanly", async () => {
  const { releaseIngestionRunLock } = await import("../../../lib/openserp-ingestion/state/ingestion-run-lock-repository");
  const releasedByOld = await releaseIngestionRunLock("owner-a");
  assert.equal(releasedByOld, false);
  const releasedByNew = await releaseIngestionRunLock("owner-c");
  assert.equal(releasedByNew, true);
  const count = await db.query<{ c: number }>("select count(*)::int as c from openserp_ingestion_run_lock;");
  assert.equal(count.rows[0].c, 0);
});

// Shared across items 14, 8, and 7 below -- all three deliberately reuse
// the SAME query_id universe (cross-invocation persistence is the point),
// sized with enough headroom above MAX_SERVERLESS_BATCH_SIZE that item 8's
// batchSizeOverride:3 can always find 3 genuinely never-executed queries
// left over after item 14 fills exactly one cap's worth.
const ITEM_14_8_7_UNIVERSE_SIZE = MAX_SERVERLESS_BATCH_SIZE + 3;
function item1487Fixture() {
  return Array.from({ length: ITEM_14_8_7_UNIVERSE_SIZE }, (_, i) => ({ id: `itg-q${i + 1}`, queryText: `appartement a vendre fixture ${i + 1}`, city: i % 2 === 0 ? "Casablanca" : "Rabat" }));
}

test("item 14: a serverless invocation's batch is capped at MAX_SERVERLESS_BATCH_SIZE even when more queries and budget are available; item 6: completes normally under ample time budget", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  // Universe deliberately larger than MAX_SERVERLESS_BATCH_SIZE so the cap
  // (not "however many queries exist") is what's actually being asserted.
  const fixturePath = writeFixture(item1487Fixture());

  const run1 = await runIngestionCycle({
    runId: "itg-run-1",
    scheduledAtIso: new Date(fakeClock).toISOString(),
    universePath: fixturePath,
    write: false,
    now,
    routeMaxDurationMs: 120_000,
    safetyMarginMs: 20_000,
  });
  assert.equal(run1.metrics.planned_unit_count, MAX_SERVERLESS_BATCH_SIZE, `batch must be capped at MAX_SERVERLESS_BATCH_SIZE (${MAX_SERVERLESS_BATCH_SIZE})`);
  assert.equal(run1.metrics.outcome_status, "completed");
  assert.equal(run1.metrics.executed_unit_count, MAX_SERVERLESS_BATCH_SIZE);
});

test("item 8: a second invocation resumes with the remaining never-executed queries (cross-invocation persistence)", async () => {
  // Uses batchSizeOverride (the same override mechanism the CLI bootstrap
  // script relies on) to pin the batch to exactly 3, independent of
  // MAX_SERVERLESS_BATCH_SIZE -- isolating "does rotation correctly favor
  // never-executed queries across invocations" from "does the batch cap
  // backfill with already-executed queries when fewer than the cap remain
  // never-executed" (the latter is normal, expected planner behavior, not
  // a bug -- run 1's larger universe already has MAX_SERVERLESS_BATCH_SIZE
  // queries executed, so a budget that large in run 2 would legitimately
  // reselect some of them too).
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  const fixturePath = writeFixture(item1487Fixture());

  await runIngestionCycle({
    runId: "itg-run-2",
    scheduledAtIso: new Date(fakeClock).toISOString(),
    universePath: fixturePath,
    write: false,
    now,
    routeMaxDurationMs: 120_000,
    safetyMarginMs: 20_000,
    batchSizeOverride: 3,
  });

  const run1Ids = (await db.query<{ query_id: string }>("select query_id from openserp_query_rotation_state where last_run_id = 'itg-run-1' order by query_id;")).rows.map((r) => r.query_id);
  const run2Ids = (await db.query<{ query_id: string }>("select query_id from openserp_query_rotation_state where last_run_id = 'itg-run-2' order by query_id;")).rows.map((r) => r.query_id);
  assert.equal(run1Ids.length, MAX_SERVERLESS_BATCH_SIZE);
  assert.equal(run2Ids.length, 3);
  assert.ok(run1Ids.every((id) => !run2Ids.includes(id)), "run 2 must select different (never-executed) queries than run 1");
});

test("item 7: retrying the same runId is idempotent -- no duplicate rows created", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  const fixturePath = writeFixture(item1487Fixture());

  await runIngestionCycle({
    runId: "itg-run-2", // deliberately the same runId as the previous test
    scheduledAtIso: new Date(fakeClock).toISOString(),
    universePath: fixturePath,
    write: false,
    now,
    routeMaxDurationMs: 120_000,
    safetyMarginMs: 20_000,
    batchSizeOverride: 3,
  });

  const totalRows = await db.query<{ c: number }>("select count(*)::int as c from openserp_query_rotation_state;");
  assert.equal(totalRows.rows[0].c, ITEM_14_8_7_UNIVERSE_SIZE, `idempotent upserts must never create duplicate rows for the same ${ITEM_14_8_7_UNIVERSE_SIZE} query_ids`);
});

test("items 2-3, Phase 10: a run stops voluntarily on time-budget exhaustion, checkpointing only the units that actually completed", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  const fixturePath = writeFixture([
    { id: "itg2-q1", queryText: "fixture v2 query 1", city: "Marrakech" },
    { id: "itg2-q2", queryText: "fixture v2 query 2", city: "Marrakech" },
    { id: "itg2-q3", queryText: "fixture v2 query 3", city: "Marrakech" },
    { id: "itg2-q4", queryText: "fixture v2 query 4", city: "Marrakech" },
  ]);

  // Each fake call advances the clock by 200ms. MIN_VIABLE_CALL_BUDGET_MS
  // (run-orchestrator.ts) is 3000ms -- the outer loop refuses to start a
  // query once remaining budget drops below that floor. A usable window
  // of 3100ms lets exactly one query run (remaining 3100 -> 2900 after
  // one call), then the second query's own pre-check (2900 < 3000) stops
  // the run, forcing a voluntary stop rather than a real timeout.
  const run = await runIngestionCycle({
    runId: "itg-run-3-partial",
    scheduledAtIso: new Date(fakeClock).toISOString(),
    universePath: fixturePath,
    write: false,
    now,
    routeMaxDurationMs: 3_600,
    safetyMarginMs: 500,
  });

  assert.equal(run.metrics.outcome_status, "time_budget_exhausted");
  assert.ok(run.metrics.executed_unit_count < run.metrics.planned_unit_count, "must execute fewer units than planned");
  assert.ok(run.metrics.executed_unit_count >= 1, "at least the first unit must have completed and been checkpointed");

  const persisted = await db.query<{ query_id: string }>("select query_id from openserp_query_rotation_state where last_run_id = 'itg-run-3-partial';");
  assert.equal(persisted.rows.length, run.metrics.executed_unit_count, "exactly the executed units must be checkpointed");

  // Since OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 (executed-only
  // hydration, no hot-path seeding), a never-run query may have NO row at
  // all -- absent is equivalent to default state and equally proves the
  // unit was never marked as run.
  const lastQuery = await db.query<{ last_run_id: string | null }>("select last_run_id from openserp_query_rotation_state where query_id = 'itg2-q4';");
  assert.ok(
    lastQuery.rows.length === 0 || lastQuery.rows[0].last_run_id !== "itg-run-3-partial",
    "a unit that was never started must not be marked as run (absent row or a different run id both prove this)",
  );
});

test("items 4-5: engine timeout and engine error are both classified and don't block persistence of the rest of the batch", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  engineBehaviors.set("timeout case", { kind: "timeout" });
  engineBehaviors.set("error case", { kind: "error" });
  const fixturePath = writeFixture([
    { id: "itg3-timeout", queryText: "timeout case", city: "Fes" },
    { id: "itg3-error", queryText: "error case", city: "Fes" },
    { id: "itg3-ok", queryText: "ok case", city: "Fes" },
  ]);

  const run = await runIngestionCycle({
    runId: "itg-run-4-mixed",
    scheduledAtIso: new Date(fakeClock).toISOString(),
    universePath: fixturePath,
    write: false,
    now,
    routeMaxDurationMs: 120_000,
    safetyMarginMs: 20_000,
  });

  assert.ok(run.metrics.timeout_count >= 1, "expected at least 1 classified engine timeout");
  assert.ok(run.metrics.query_failure_count >= 2, "expected at least 2 query failures (timeout + error case)");
  assert.equal(run.metrics.executed_unit_count, 3, "all 3 units must still be attempted/checkpointed despite 2 failing");
});

test("items 17-18: write=false never invokes the writer, proving business counters can't be touched by construction", async () => {
  assert.equal(writerCalls, 0, "write=false must never call writeNationalIngestionRun across any test above");
});
