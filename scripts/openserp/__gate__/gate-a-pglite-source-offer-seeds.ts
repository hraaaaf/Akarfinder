// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 -- #4/10 Gate A (PGlite).
// Not part of the committed test suite (excluded from tsconfig/test globs by
// living under __gate__/, matching gate-a-pglite-serverless-state.ts). No
// Production connection, no Production data. Proves the source_offer_seeds
// migration's DB-level safety properties before it is ever applied to
// Production: idempotent re-run, canonical_url uniqueness, freshness_status
// CHECK constraint, observation_count CHECK constraint, and a clean rollback.

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATION_FILE = "20260721000000_create_source_offer_seeds.sql";

const report: Record<string, unknown> = {
  gate_id: "commoncrawl-bulk-seed-harvest-gate-a",
  mission: "AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#4/10)",
  generated_at_utc: new Date().toISOString(),
  engine: "@electric-sql/pglite (embedded WASM Postgres, ephemeral)",
  no_production_connection_made: true,
  no_production_data_used: true,
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create extension if not exists pgcrypto;`);

  // ---- migration (re-run twice to prove IF NOT EXISTS idempotency) ----
  const sql = readFileSync(join(MIGRATIONS_DIR, MIGRATION_FILE), "utf8");
  await db.exec(sql);
  await db.exec(sql);
  report.migration = { status: "PASS", file: MIGRATION_FILE, applied_twice_no_error: true };

  // ---- insert a seed row ----
  await db.exec(`
    insert into source_offer_seeds (canonical_url, source_domain, seed_provider, observation_count, metadata)
    values ('https://soukimmobilier.com/fr/agadir/appartement/37786924', 'soukimmobilier.com', 'commoncrawl_cdx', 3, '{"cdx_indexes_seen":["CC-MAIN-2026-25"]}'::jsonb);
  `);
  const countAfterInsert = await db.query<{ count: string }>("select count(*)::text from source_offer_seeds;");
  assert(countAfterInsert.rows[0].count === "1", "expected exactly 1 row after first insert");

  // ---- canonical_url uniqueness: a second insert of the SAME canonical_url must be rejected ----
  let duplicateRejected = false;
  try {
    await db.exec(`
      insert into source_offer_seeds (canonical_url, source_domain, seed_provider)
      values ('https://soukimmobilier.com/fr/agadir/appartement/37786924', 'soukimmobilier.com', 'commoncrawl_cdx');
    `);
  } catch (error) {
    duplicateRejected = /duplicate key|unique constraint/i.test(String(error));
  }
  assert(duplicateRejected, "expected a duplicate canonical_url insert to be rejected by the unique index");
  report.canonical_url_uniqueness = { status: "PASS" };

  // ---- default freshness_status is 'seed_only' ----
  const defaultStatus = await db.query<{ freshness_status: string }>(
    "select freshness_status from source_offer_seeds where canonical_url = 'https://soukimmobilier.com/fr/agadir/appartement/37786924';",
  );
  assert(defaultStatus.rows[0].freshness_status === "seed_only", "expected default freshness_status to be seed_only");
  report.default_freshness_status = { status: "PASS", value: defaultStatus.rows[0].freshness_status };

  // ---- freshness_status CHECK constraint rejects an invalid value ----
  let invalidStatusRejected = false;
  try {
    await db.exec(`
      insert into source_offer_seeds (canonical_url, source_domain, seed_provider, freshness_status)
      values ('https://masaken.ma/fr/immobilier-maroc/rabat/12345', 'masaken.ma', 'commoncrawl_cdx', 'definitely_active');
    `);
  } catch (error) {
    invalidStatusRejected = /check constraint|source_offer_seeds_freshness_status_check/i.test(String(error));
  }
  assert(invalidStatusRejected, "expected an invalid freshness_status value to be rejected by the CHECK constraint");
  report.freshness_status_check_constraint = { status: "PASS" };

  // ---- observation_count CHECK constraint rejects 0/negative ----
  let invalidCountRejected = false;
  try {
    await db.exec(`
      insert into source_offer_seeds (canonical_url, source_domain, seed_provider, observation_count)
      values ('https://daragadir.com/fr/agadir/villa/999', 'daragadir.com', 'commoncrawl_cdx', 0);
    `);
  } catch (error) {
    invalidCountRejected = /check constraint|source_offer_seeds_observation_count_check/i.test(String(error));
  }
  assert(invalidCountRejected, "expected observation_count = 0 to be rejected by the CHECK constraint");
  report.observation_count_check_constraint = { status: "PASS" };

  // ---- valid second row + freshness promotion fields ----
  await db.exec(`
    insert into source_offer_seeds (canonical_url, source_domain, seed_provider, freshness_status, fresh_last_seen_at, fresh_channels)
    values ('https://masaken.ma/fr/immobilier-maroc/rabat/12345', 'masaken.ma', 'commoncrawl_cdx', 'fresh_confirmed', now(), array['openserp']);
  `);
  const finalCount = await db.query<{ count: string }>("select count(*)::text from source_offer_seeds;");
  assert(finalCount.rows[0].count === "2", "expected exactly 2 valid rows total");
  report.freshness_promotion_row = { status: "PASS" };

  // ---- rollback: drop table if exists must succeed cleanly ----
  await db.exec(`drop table if exists source_offer_seeds;`);
  const postRollback = await db.query<{ exists: boolean }>(
    `select exists (select 1 from information_schema.tables where table_name = 'source_offer_seeds') as exists;`,
  );
  assert(postRollback.rows[0].exists === false, "expected source_offer_seeds to be gone after rollback");
  report.rollback = { status: "PASS" };

  report.overall_verdict = "PASS_STRICT";
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("GATE FAILED:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
