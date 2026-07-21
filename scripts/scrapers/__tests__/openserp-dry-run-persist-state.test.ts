// OPENSERP-GITHUB-NATIVE-TRANSPORT-1
// Proves runIngestionCycle's new persistState flag actually makes --dry-run
// leave zero durable trace: no business write, no
// openserp_query_rotation_state upsert, no openserp_engine_budget_state
// upsert -- while persistState=true (the default, used by every
// pre-existing caller: the Vercel cron route, the bootstrap CLI, and every
// pre-existing test) keeps writing state exactly as before. Same
// PGlite-backed fake-Supabase harness as
// openserp-engine-error-integration.test.ts. Run via the dedicated
// `test:openserp-time-budget-and-lock-safety` npm script (requires
// --experimental-test-module-mocks, since it replaces the openserp-live and
// national-writer modules).

import { test, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeFakeSupabaseClient } from "./helpers/fake-supabase-postgrest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = [
  "20260718140000_create_openserp_query_rotation_state.sql",
  "20260718140100_create_openserp_engine_budget_state.sql",
  "20260718180000_create_openserp_ingestion_run_lock.sql",
];

let db: InstanceType<typeof PGlite>;
const now = () => 1_700_000_000_000;

const writeNationalIngestionRunCalls: unknown[] = [];

before(async () => {
  db = new PGlite();
  await db.exec("create role service_role;");
  for (const file of MIGRATIONS) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  mock.module("@/lib/db/supabase-client", {
    namedExports: { getSupabaseServerClient: () => makeFakeSupabaseClient(db, () => 0) },
  });
  // Every query in this fixture "succeeds" with zero raw results, so no
  // admission decision is ever produced and writeNationalIngestionRun would
  // have nothing to do even if called -- the assertion below still directly
  // proves the call itself never happens, which is what `write: false` is
  // actually supposed to guarantee.
  mock.module("@/lib/openserp-ingestion/openserp-live", {
    namedExports: {
      DEFAULT_ENGINE_CALL_TIMEOUT_MS: 15_000,
      EngineCallError: class extends Error {},
      runOpenSerpLiveQuery: async (input: { engine: string; query: string }) => ({
        response: {
          engine: input.engine,
          query: input.query,
          results: [],
          fetched_at: new Date(now()).toISOString(),
          provider: "openserp_async_poc",
        },
        provider: {
          provider: "openserp",
          provider_mode: "local_http",
          provider_endpoint: "http://127.0.0.1:7070",
          provider_live_or_fixture: "live",
        },
      }),
    },
  });
  mock.module("@/lib/openserp-ingestion/national-writer", {
    namedExports: {
      writeNationalIngestionRun: async (input: unknown) => {
        writeNationalIngestionRunCalls.push(input);
        return { updated_listing_sources: 0, new_property_listings: 0, new_listing_sources: 0, new_clusters: 0, new_memberships: 0, write_errors: [] };
      },
    },
  });
});

beforeEach(async () => {
  await db.exec("delete from openserp_query_rotation_state; delete from openserp_engine_budget_state; delete from openserp_ingestion_run_lock;");
  writeNationalIngestionRunCalls.length = 0;
});

after(() => {
  mock.reset();
});

function writeFixture(runLabel: string): string {
  const universe = {
    universe_version: `dry-run-persist-state-fixture-${runLabel}`,
    queries: [1, 2].map((i) => ({
      query_id: `drps-${runLabel}-q${i}`,
      city: "Casablanca",
      district: null,
      priority_tier: 1 as const,
      transaction: "sale" as const,
      property_type: "appartement",
      language: "fr" as const,
      preferred_engine: "bing" as const,
      query_text: `fixture query ${runLabel} ${i}`,
      target_domain: null,
      query_family: "general" as const,
    })),
  };
  const path = join(tmpdir(), `openserp-dry-run-persist-state-fixture-${runLabel}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(universe), "utf8");
  return path;
}

async function countRows(table: string): Promise<number> {
  const result = await db.query<{ c: number }>(`select count(*)::int as c from ${table};`);
  return result.rows[0]?.c ?? 0;
}

test("dry-run (write:false, persistState:false) makes zero business write", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  const universePath = writeFixture("business");

  await runIngestionCycle({
    runId: "drps-business-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath,
    write: false,
    persistState: false,
    batchSizeOverride: 2,
    now,
  });

  assert.equal(writeNationalIngestionRunCalls.length, 0);
});

test("dry-run (persistState:false) makes zero openserp_query_rotation_state write", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  const universePath = writeFixture("rotation");

  const { metrics } = await runIngestionCycle({
    runId: "drps-rotation-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath,
    write: false,
    persistState: false,
    batchSizeOverride: 2,
    now,
  });

  assert.equal(await countRows("openserp_query_rotation_state"), 0);
  // The queries were still run in-memory (metrics reflect real execution) --
  // only the DB checkpoint was skipped. Each query attempts up to 2 engines
  // (the fixture returns zero results, so the orchestrator never short-
  // circuits after the first engine), hence 2 queries * 2 engines = 4
  // successful engine-call attempts, but only 2 executed query units.
  assert.equal(metrics.query_success_count, 4);
  assert.equal(metrics.executed_unit_count, 2);
  assert.equal(metrics.state_persisted, false);
});

test("dry-run (persistState:false) makes zero openserp_engine_budget_state write", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  const universePath = writeFixture("budget");

  await runIngestionCycle({
    runId: "drps-budget-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath,
    write: false,
    persistState: false,
    batchSizeOverride: 2,
    now,
  });

  assert.equal(await countRows("openserp_engine_budget_state"), 0);
});

test("persistState:true (the pre-existing default) still persists rotation and budget state exactly as before", async () => {
  const { runIngestionCycle } = await import("../../../lib/openserp-ingestion/run-orchestrator");
  const universePath = writeFixture("persisted");

  const { metrics } = await runIngestionCycle({
    runId: "drps-persisted-run",
    scheduledAtIso: new Date(now()).toISOString(),
    universePath,
    write: false,
    // persistState omitted entirely -- must default to true, matching every
    // pre-existing caller (Vercel cron route, bootstrap CLI) unmodified.
    batchSizeOverride: 2,
    now,
  });

  assert.equal(await countRows("openserp_query_rotation_state"), 2);
  assert.equal(await countRows("openserp_engine_budget_state"), 3);
  assert.equal(metrics.state_persisted, true);

  const rotationRows = await db.query<{ query_id: string; last_run_id: string }>(
    "select query_id, last_run_id from openserp_query_rotation_state order by query_id;",
  );
  assert.deepEqual(
    rotationRows.rows.map((r) => r.query_id),
    ["drps-persisted-q1", "drps-persisted-q2"],
  );
  assert.ok(rotationRows.rows.every((r) => r.last_run_id === "drps-persisted-run"));
});
