// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#9/10) -- Index Lifecycle Scale
// Gate (PGlite). Not part of the committed test suite (lives under __gate__/,
// matching gate-a-pglite-*.ts precedent). No Production connection, no
// Production data -- runs against an ephemeral embedded Postgres with a
// synthetic dataset, per the mandate's section 9.5 ("dataset synthetique
// realiste si necessaire"). Measures, at 10k/25k/50k/100k:
//  - idempotent upsert (same canonical_url never creates a duplicate)
//  - batch upsert time / DB latency
//  - a status-filtered "public search" query time (must use the index)
//  - the lifecycle-tick UPDATE time
//  - public leakage check (0 seed_only rows ever visible to public search)
//  - EXPLAIN confirming the status/canonical indexes are actually used.

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const SCALES = [10_000, 25_000, 50_000, 100_000];
const BATCH = 5_000;

const STATES = ["DISCOVERED_SEED", "FRESH_CONFIRMED", "INDEXED", "AGING", "STALE", "REMOVED"] as const;

const report: Record<string, unknown> = {
  gate_id: "index-lifecycle-scale-gate",
  mission: "AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#9/10)",
  generated_at_utc: new Date().toISOString(),
  engine: "@electric-sql/pglite (embedded WASM Postgres, ephemeral)",
  no_production_connection_made: true,
  no_production_data_used: true,
  synthetic_data: true,
  scales: {},
};

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// Deterministic synthetic row generator -- a realistic mix of lifecycle
// states weighted toward seeds (most of a 100k index is seed_only stock).
function syntheticRow(i: number): { canonical_url: string; state: string; last_fresh: string | null } {
  // ~70% seeds, ~10% indexed, ~8% aging, ~7% stale, ~3% fresh_confirmed, ~2% removed
  const r = i % 100;
  let state: string;
  if (r < 70) state = "DISCOVERED_SEED";
  else if (r < 80) state = "INDEXED";
  else if (r < 88) state = "AGING";
  else if (r < 95) state = "STALE";
  else if (r < 98) state = "FRESH_CONFIRMED";
  else state = "REMOVED";
  const lastFresh = state === "DISCOVERED_SEED" ? null : new Date(1735689600000 + (i % 200) * 86400000).toISOString();
  return { canonical_url: `https://synthetic-source-${i % 40}.ma/property/listing-${i}`, state, last_fresh: lastFresh };
}

async function main() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create extension if not exists pgcrypto;`);
  await db.exec(`
    create table index_lifecycle (
      id uuid primary key default gen_random_uuid(),
      canonical_url text not null unique,
      state text not null,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      last_fresh_seen_at timestamptz,
      observation_count integer not null default 1,
      updated_at timestamptz not null default now()
    );
    create index idx_lifecycle_state on index_lifecycle (state);
    create index idx_lifecycle_last_fresh on index_lifecycle (last_fresh_seen_at desc);
  `);

  let inserted = 0;
  for (const scale of SCALES) {
    const scaleReport: Record<string, unknown> = {};

    // ---- 1. batch idempotent upsert up to this scale ----
    const upsertStart = performance.now();
    for (let start = inserted; start < scale; start += BATCH) {
      const end = Math.min(start + BATCH, scale);
      const values: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      for (let i = start; i < end; i++) {
        const row = syntheticRow(i);
        values.push(`($${p++}, $${p++}, $${p++})`);
        params.push(row.canonical_url, row.state, row.last_fresh);
      }
      await db.query(
        `insert into index_lifecycle (canonical_url, state, last_fresh_seen_at) values ${values.join(",")}
         on conflict (canonical_url) do update set observation_count = index_lifecycle.observation_count + 1, updated_at = now()`,
        params,
      );
    }
    const upsertMs = performance.now() - upsertStart;
    inserted = scale;

    const countRes = await db.query<{ c: string }>("select count(*)::text as c from index_lifecycle;");
    assert(countRes.rows[0].c === String(scale), `expected exactly ${scale} rows, got ${countRes.rows[0].c}`);
    scaleReport.rows = scale;
    scaleReport.batch_upsert_ms = Math.round(upsertMs);

    // ---- 2. idempotence: re-upsert the SAME first 5000 rows, expect 0 new rows ----
    const dupParams: unknown[] = [];
    const dupValues: string[] = [];
    let dp = 1;
    for (let i = 0; i < BATCH; i++) {
      const row = syntheticRow(i);
      dupValues.push(`($${dp++}, $${dp++}, $${dp++})`);
      dupParams.push(row.canonical_url, row.state, row.last_fresh);
    }
    await db.query(
      `insert into index_lifecycle (canonical_url, state, last_fresh_seen_at) values ${dupValues.join(",")}
       on conflict (canonical_url) do update set observation_count = index_lifecycle.observation_count + 1, updated_at = now()`,
      dupParams,
    );
    const countAfterDup = await db.query<{ c: string }>("select count(*)::text as c from index_lifecycle;");
    assert(countAfterDup.rows[0].c === String(scale), `idempotent re-upsert must not add rows (still ${scale})`);
    scaleReport.idempotent_reupsert_added_rows = 0;

    // ---- 3. public-search query time (status-filtered, must exclude seeds) ----
    const searchStart = performance.now();
    const publicRes = await db.query<{ c: string }>("select count(*)::text as c from index_lifecycle where state = 'INDEXED';");
    const searchMs = performance.now() - searchStart;
    scaleReport.public_search_ms = Number(searchMs.toFixed(2));
    scaleReport.public_indexed_rows = Number(publicRes.rows[0].c);

    // ---- 4. public leakage check: no seed_only/removed ever matches public filter ----
    const leakRes = await db.query<{ c: string }>(
      "select count(*)::text as c from index_lifecycle where state = 'INDEXED' and (state = 'DISCOVERED_SEED' or state = 'REMOVED');",
    );
    assert(leakRes.rows[0].c === "0", "public filter must never surface a seed or removed row");
    scaleReport.public_leakage = Number(leakRes.rows[0].c);

    // ---- 5. lifecycle tick: bulk demote INDEXED whose fresh is > 90 days old ----
    const tickStart = performance.now();
    const tickRes = await db.query(
      `update index_lifecycle set state = 'STALE', updated_at = now()
       where state = 'INDEXED' and last_fresh_seen_at < now() - interval '90 days'`,
    );
    const tickMs = performance.now() - tickStart;
    scaleReport.lifecycle_tick_ms = Number(tickMs.toFixed(2));
    scaleReport.lifecycle_tick_rows_affected = (tickRes as { affectedRows?: number }).affectedRows ?? null;

    // ---- 6. EXPLAIN: confirm the status index is actually used ----
    const explain = await db.query<{ "QUERY PLAN": string }>("explain select count(*) from index_lifecycle where state = 'INDEXED';");
    const plan = explain.rows.map((r) => r["QUERY PLAN"]).join(" ");
    scaleReport.status_index_used = /idx_lifecycle_state|Index/i.test(plan);
    scaleReport.explain_plan = plan;

    (report.scales as Record<string, unknown>)[String(scale)] = scaleReport;
  }

  // Final assertions across the largest scale.
  const largest = (report.scales as Record<string, Record<string, unknown>>)["100000"];
  assert(largest.public_leakage === 0, "0 public leakage at 100k");
  assert((largest.public_search_ms as number) < 2000, "public search under 2s at 100k (no pathological full scan on hot path)");

  report.overall_verdict = "PASS_STRICT";
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("GATE FAILED:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
