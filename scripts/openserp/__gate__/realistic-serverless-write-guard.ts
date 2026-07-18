// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 -- realistic serverless read-only
// filesystem gate (post-Gate-B reconciliation order, steps 4-6).
//
// Not part of the committed test suite (excluded from tsconfig via the
// scripts/ exclude, matching gate-a-pglite-serverless-state.ts precedent).
// No Production connection, no Production data.
//
// This gate calls the REAL, unmodified runIngestionCycle() from
// run-orchestrator.ts -- not a mock of the orchestrator itself. Exactly
// three external boundaries are substituted, each independently justified:
//   1. @/lib/db/supabase-client -- no real network Postgres/PostgREST
//      available inline; replaced with a thin adapter that translates the
//      two call shapes the repositories actually use
//      (.from().select().in() and .from().upsert()) into real SQL against
//      a real, ephemeral, in-process PGlite instance running the actual
//      migrations.
//   2. @/lib/openserp-ingestion/openserp-live -- an external network/CLI
//      call to a search engine; replaced with a deterministic empty-result
//      response so the test never depends on network access.
//   3. @/lib/openserp-ingestion/national-writer -- the mission explicitly
//      forbids any real listing write; replaced with a no-op that proves
//      it was *reached* (call counter) without touching any listing data
//      anywhere, real or fake.
// Every other line -- run-orchestrator.ts's own control flow, the rotation
// planner, the budget policy, the state repositories, the service-layer
// hashing/hydration/persistence functions -- executes for real, unmodified.
//
// The read-only-filesystem simulation: node:fs's writeFileSync, mkdirSync,
// appendFileSync, renameSync and copyFileSync are mocked to throw an EROFS
// error if called at all. Since the serverless route never sets
// rawResultsDir, none of these should ever be invoked by this run -- if the
// old bug (or a regression of it) resurfaces, this script crashes with an
// uncaught EROFS error rather than silently passing.

import { mock } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const fs = require("node:fs");
// A plain value copy of the original function, captured before mock.method
// mutates fs.writeFileSync -- unlike an ESM named import of a builtin
// (which is a *live* binding that would also resolve to the mock), this is
// a snapshot, immune to the later mutation below.
const originalWriteFileSync: typeof fs.writeFileSync = fs.writeFileSync;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = [
  "20260718140000_create_openserp_query_rotation_state.sql",
  "20260718140100_create_openserp_engine_budget_state.sql",
];

const report: Record<string, unknown> = {
  gate_id: "openserp-serverless-state-realistic-gate",
  mission: "OPENSERP-SERVERLESS-STATE-PERSISTENCE-1",
  generated_at_utc: new Date().toISOString(),
  engine: "@electric-sql/pglite (embedded WASM Postgres, ephemeral, in-process)",
  no_production_connection_made: true,
  no_production_data_used: true,
  no_real_network_call_made: true,
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  // ---- 1. read-only-filesystem simulation: throw on every runtime write call ----
  const eROFS = () => {
    throw Object.assign(new Error("EROFS: read-only file system (simulated /var/task)"), { code: "EROFS" });
  };
  const writeFileSyncMock = mock.method(fs, "writeFileSync", eROFS);
  const mkdirSyncMock = mock.method(fs, "mkdirSync", eROFS);
  const appendFileSyncMock = mock.method(fs, "appendFileSync", eROFS);
  const renameSyncMock = mock.method(fs, "renameSync", eROFS);
  const copyFileSyncMock = mock.method(fs, "copyFileSync", eROFS);

  // ---- 2. real, ephemeral PGlite instance + real migrations ----
  const db = new PGlite();
  for (const file of MIGRATIONS) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.exec(sql);
  }
  report.migrations_applied = MIGRATIONS;

  function toSqlLiteral(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  // Thin adapter: translates exactly the two supabase-js call shapes the
  // repository files use into real parameterized-by-literal SQL against
  // the real PGlite instance. No business logic lives here -- only wire
  // translation, matching PostgREST's own select/upsert semantics.
  function makeFakeSupabaseClient() {
    return {
      from(table: string) {
        return {
          select(_cols: string) {
            return {
              in: async (col: string, values: string[]) => {
                if (values.length === 0) return { data: [], error: null };
                const list = values.map(toSqlLiteral).join(",");
                const result = await db.query(`select * from ${table} where ${col} in (${list});`);
                return { data: result.rows, error: null };
              },
            };
          },
          upsert: async (rows: Array<Record<string, unknown>>, opts: { onConflict: string; ignoreDuplicates?: boolean }) => {
            for (const row of rows) {
              const cols = Object.keys(row);
              const values = cols.map((c) => toSqlLiteral(row[c]));
              const conflictAction = opts.ignoreDuplicates
                ? "do nothing"
                : `do update set ${cols.filter((c) => c !== opts.onConflict).map((c) => `${c} = excluded.${c}`).join(", ")}`;
              await db.query(
                `insert into ${table} (${cols.join(",")}) values (${values.join(",")}) on conflict (${opts.onConflict}) ${conflictAction};`,
              );
            }
            return { error: null };
          },
        };
      },
    };
  }

  let writerCalls = 0;

  mock.module("@/lib/db/supabase-client", {
    namedExports: { getSupabaseServerClient: () => makeFakeSupabaseClient() },
  });
  mock.module("@/lib/openserp-ingestion/openserp-live", {
    namedExports: {
      runOpenSerpLiveQuery: async () => ({
        response: { engine: "duckduckgo", query: "fixture", results: [], fetched_at: new Date().toISOString(), provider: "fixture" },
        provider: { provider: "fixture", provider_mode: "test_fixture", provider_endpoint: "n/a", provider_live_or_fixture: "fixture" },
      }),
    },
  });
  mock.module("@/lib/openserp-ingestion/national-writer", {
    namedExports: {
      writeNationalIngestionRun: async () => {
        writerCalls += 1;
        return {
          discovery_candidates_written: 0,
          discovery_candidates_accepted: 0,
          discovery_candidates_rejected: 0,
          discovery_candidates_unclassified: 0,
          new_property_listings: 0,
          updated_property_listings: 0,
          new_listing_sources: 0,
          updated_listing_sources: 0,
          new_clusters: 0,
          new_memberships: 0,
          multi_source_clusters_created: 0,
          observations_created: 0,
          write_errors: [],
        };
      },
    },
  });

  // ---- 3. tiny deterministic fixture universe (real file, real readFileSync -- reading is never blocked) ----
  const fixtureUniverse = {
    universe_version: "realistic-gate-fixture-v1",
    queries: [
      { query_id: "rlt-q1", city: "Casablanca", district: null, priority_tier: 1, transaction: "sale", property_type: "appartement", language: "fr", preferred_engine: "duckduckgo", query_text: "appartement a vendre casablanca", target_domain: null, query_family: "general" },
      { query_id: "rlt-q2", city: "Casablanca", district: null, priority_tier: 1, transaction: "sale", property_type: "appartement", language: "fr", preferred_engine: "duckduckgo", query_text: "appartement a vendre casablanca 2", target_domain: null, query_family: "general" },
      { query_id: "rlt-q3", city: "Rabat", district: null, priority_tier: 1, transaction: "sale", property_type: "appartement", language: "fr", preferred_engine: "bing", query_text: "appartement a vendre rabat", target_domain: null, query_family: "general" },
      { query_id: "rlt-q4", city: "Rabat", district: null, priority_tier: 1, transaction: "sale", property_type: "appartement", language: "fr", preferred_engine: "bing", query_text: "appartement a vendre rabat 2", target_domain: null, query_family: "general" },
    ],
  };
  const fixturePath = join(tmpdir(), `openserp-realistic-gate-universe-${Date.now()}.json`);
  // Uses the real writeFileSync snapshot captured before mocking (test-setup
  // only, never inside run-orchestrator.ts's own code path) to place the
  // fixture on disk so runIngestionCycle's readFileSync(universePath) can
  // find it.
  originalWriteFileSync(fixturePath, JSON.stringify(fixtureUniverse), "utf8");

  // ---- 4. dynamic import AFTER mocks are registered, exactly as run-time production code resolves it ----
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");

  // ---- run 1: write=false (matches the mission's own mandated flags-off state) ----
  const run1 = await runIngestionCycle({
    runId: "rlt-run-1",
    scheduledAtIso: new Date().toISOString(),
    universePath: fixturePath,
    write: false,
    batchSizeOverride: 2,
    // rawResultsDir intentionally omitted -- the serverless route never sets it.
  });
  assert(run1.metrics.query_count === 2, `run 1 expected batch of 2, got ${run1.metrics.query_count}`);
  assert(writerCalls === 0, "writer must not be called when write=false");

  const afterRun1 = await db.query<{ query_id: string; last_run_id: string | null }>(
    "select query_id, last_run_id from openserp_query_rotation_state order by query_id;",
  );
  const run1Ids = afterRun1.rows.filter((r) => r.last_run_id === "rlt-run-1").map((r) => r.query_id).sort();
  assert(run1Ids.length === 2, `expected exactly 2 rows stamped with run 1's id, got ${run1Ids.length}`);
  assert(run1Ids[0] === "rlt-q1" && run1Ids[1] === "rlt-q2", `expected rlt-q1/rlt-q2 (lowest ids, never-executed) selected first, got ${run1Ids.join(",")}`);
  report.run_1 = { status: "PASS", batch_selected: run1Ids, write_mode: false };

  // ---- run 2: a genuinely separate invocation (fresh runId, no JS state carried over except the DB) -- write=true to literally exercise and prove the writer gate is reached, safely (writer is a no-op fake, zero real writes anywhere) ----
  const run2 = await runIngestionCycle({
    runId: "rlt-run-2",
    scheduledAtIso: new Date().toISOString(),
    universePath: fixturePath,
    write: true,
    batchSizeOverride: 2,
  });
  assert(run2.metrics.query_count === 2, `run 2 expected batch of 2, got ${run2.metrics.query_count}`);
  assert(writerCalls === 1, `writer must be called exactly once when write=true, got ${writerCalls} calls`);

  const afterRun2 = await db.query<{ query_id: string; last_run_id: string | null }>(
    "select query_id, last_run_id from openserp_query_rotation_state order by query_id;",
  );
  const run2Ids = afterRun2.rows.filter((r) => r.last_run_id === "rlt-run-2").map((r) => r.query_id).sort();
  assert(run2Ids.length === 2, `expected exactly 2 rows stamped with run 2's id, got ${run2Ids.length}`);
  assert(
    run2Ids[0] === "rlt-q3" && run2Ids[1] === "rlt-q4",
    `expected run 2 to select rlt-q3/rlt-q4 (the only still-never-executed queries, because run 1's state persisted) -- got ${run2Ids.join(",")}. If this fails, run 2 re-selected run 1's queries, meaning state did NOT persist across invocations.`,
  );
  // run 1's rows must be untouched by run 2 -- proves no cross-run clobbering.
  const q1AfterRun2 = afterRun2.rows.find((r) => r.query_id === "rlt-q1")!;
  assert(q1AfterRun2.last_run_id === "rlt-run-1", "run 1's rlt-q1 state must remain from run 1, untouched by run 2");

  const budgetRows = await db.query<{ engine: string; last_run_id: string | null }>(
    "select engine, last_run_id from openserp_engine_budget_state order by engine;",
  );
  assert(budgetRows.rows.length === 3, `expected 3 engine budget rows, got ${budgetRows.rows.length}`);
  assert(budgetRows.rows.every((r) => r.last_run_id === "rlt-run-2"), "all 3 engine budget rows must reflect the most recent run");

  report.run_2 = { status: "PASS", batch_selected: run2Ids, write_mode: true, writer_calls: writerCalls };
  report.second_invocation_uses_previous_state = true;
  report.query_state_persisted = true;
  report.engine_state_persisted = true;
  report.writer_layer_reached = writerCalls === 1;

  // ---- filesystem write-call assertions ----
  const fsCallCounts = {
    writeFileSync: writeFileSyncMock.mock.calls.length,
    mkdirSync: mkdirSyncMock.mock.calls.length,
    appendFileSync: appendFileSyncMock.mock.calls.length,
    renameSync: renameSyncMock.mock.calls.length,
    copyFileSync: copyFileSyncMock.mock.calls.length,
  };
  const totalRuntimeWrites = Object.values(fsCallCounts).reduce((a, b) => a + b, 0);
  assert(totalRuntimeWrites === 0, `expected 0 filesystem write calls from the orchestration path, got ${JSON.stringify(fsCallCounts)}`);

  report.filesystem_write_call_counts = fsCallCounts;
  report.filesystem_runtime_writes = totalRuntimeWrites;
  report.erofs_errors_thrown = 0; // if any had been thrown, this script would have crashed above instead of reaching here
  report.overall_verdict = "PASS";

  mock.reset();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  report.overall_verdict = "FAIL";
  report.error = error instanceof Error ? { message: error.message, code: (error as { code?: string }).code } : String(error);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
});
