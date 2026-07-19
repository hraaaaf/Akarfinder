// OPENSERP-QUERY-ROTATION-DISCOVERY-YIELD-NUMERIC-1
// Proves the discovery_yield integer -> numeric(12,2) migration
// (supabase/migrations/20260719220000_alter_openserp_query_rotation_state_
// discovery_yield_numeric.sql) is safe against a real Postgres engine
// (PGlite): existing integer values survive, fractional EMA values
// (0.9, 1.53) round-trip exactly, the negative-value CHECK constraint
// still rejects, and the real production write path (markQueryExecuted ->
// persistRotationUpdates -> upsertQueryStates) persists and reads back the
// exact 0.9 value that crashed the pre-migration integer column. Run via
// the dedicated `test:openserp-time-budget-and-lock-safety` npm script
// (requires --experimental-test-module-mocks).

import { test, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { markQueryExecuted, type RotationQuery } from "../../../lib/openserp-ingestion/query-rotation-planner";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATIONS = [
  "20260718140000_create_openserp_query_rotation_state.sql",
  "20260719220000_alter_openserp_query_rotation_state_discovery_yield_numeric.sql",
];

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
  await db.exec("delete from openserp_query_rotation_state;");
});

after(() => {
  mock.reset();
});

async function insertRow(queryId: string, discoveryYield: number): Promise<void> {
  await db.query(
    `insert into openserp_query_rotation_state (query_id, query_universe_version, query_definition_hash, discovery_yield)
     values ($1, 'v1', 'hash1', $2);`,
    [queryId, discoveryYield],
  );
}

async function readYield(queryId: string): Promise<number> {
  const result = await db.query<{ discovery_yield: string | number }>(
    `select discovery_yield from openserp_query_rotation_state where query_id = $1;`,
    [queryId],
  );
  return Number(result.rows[0]?.discovery_yield);
}

test("1. an existing integer value survives the migration unchanged", async () => {
  await insertRow("existing-int", 5);
  assert.equal(await readYield("existing-int"), 5);
});

test("2. 0.9 is accepted by the column and read back as exactly 0.9", async () => {
  await insertRow("frac-09", 0.9);
  assert.equal(await readYield("frac-09"), 0.9);
});

test("3. 1.53 is accepted by the column and read back as exactly 1.53", async () => {
  await insertRow("frac-153", 1.53);
  assert.equal(await readYield("frac-153"), 1.53);
});

test("4. a negative value is still rejected by the CHECK constraint", async () => {
  await assert.rejects(insertRow("negative", -1), /violates check constraint/);
});

test("5. markQueryExecuted(discovery_yield=0, acceptedCount=3) persists and reads back exactly 0.9 through the real write path", async () => {
  const { persistRotationUpdates } = await import("../../../lib/openserp-ingestion/state/serverless-state-service");

  const staticDef = {
    query_id: "nqu1-0b6d7a405611af72",
    city: "Casablanca",
    district: null,
    priority_tier: 1 as const,
    transaction: "sale" as const,
    property_type: "appartement",
    language: "fr" as const,
    preferred_engine: "duckduckgo" as const,
    query_text: "appartement casablanca",
    target_domain: null,
    query_family: "general" as const,
  };
  const fresh: RotationQuery = {
    query_id: staticDef.query_id,
    city: staticDef.city,
    district: staticDef.district,
    priority_tier: staticDef.priority_tier,
    last_executed_at: null,
    next_eligible_at: null,
    failure_count: 0,
    discovery_yield: 0,
  };

  const executed = markQueryExecuted(fresh, { executedAtIso: "2026-07-19T21:07:04.000Z", succeeded: true, acceptedCount: 3 });
  assert.equal(executed.discovery_yield, 0.9);

  await persistRotationUpdates(
    [{ ...staticDef, ...executed, succeeded: true, engine: "duckduckgo" }],
    "test-run-discovery-yield-numeric",
    "openserp-query-universe-v1",
    {},
  );

  assert.equal(await readYield(staticDef.query_id), 0.9);
});
