import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const MIGRATION = resolve("supabase/migrations/20260823134500_discovery_freshness_keyset_pagination.sql");
const RECONCILER = resolve("scripts/openserp/reconcile-commoncrawl-seed-freshness.ts");
const migrationSql = readFileSync(MIGRATION, "utf8");
const reconcilerSource = readFileSync(RECONCILER, "utf8");

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

async function createDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.discovery_candidates (
      id uuid primary key,
      canonical_url text,
      source_url text not null,
      discovered_at timestamptz not null,
      discovery_status text not null
    );
  `);
  await db.exec(migrationSql);
  return db;
}

test("P0.2 cursor RPC paginates >2 pages with timestamp ties and no duplicate or omission", async () => {
  const db = await createDb();
  try {
    const eligible = Array.from({ length: 2_505 }, (_, index) => ({
      id: uuid(index + 1),
      canonical_url: `https://example.test/listing/${index}`,
      source_url: `https://example.test/raw/${index}`,
      // Ten rows deliberately share each timestamp. The UUID tie-breaker is
      // therefore required for deterministic page boundaries.
      discovered_at: new Date(Date.UTC(2026, 7, 23, 12, 0, Math.floor(index / 10))).toISOString(),
      discovery_status: index % 2 === 0 ? "accepted" : "promoted_to_source_offer",
    }));
    const rejected = Array.from({ length: 200 }, (_, index) => ({
      id: uuid(10_000 + index),
      canonical_url: `https://example.test/rejected/${index}`,
      source_url: `https://example.test/rejected/raw/${index}`,
      discovered_at: new Date(Date.UTC(2026, 7, 24, 12, 0, index % 60)).toISOString(),
      discovery_status: "discovered",
    }));

    await db.query(`
      insert into public.discovery_candidates (id, canonical_url, source_url, discovered_at, discovery_status)
      select id, canonical_url, source_url, discovered_at, discovery_status
      from jsonb_to_recordset($1::jsonb) as x(
        id uuid,
        canonical_url text,
        source_url text,
        discovered_at timestamptz,
        discovery_status text
      )
    `, [JSON.stringify([...eligible, ...rejected])]);

    const seen: string[] = [];
    let beforeAt: string | null = null;
    let beforeId: string | null = null;
    let pages = 0;

    for (;;) {
      const page = await db.query<{ id: string; discovered_at: string }>(`
        select id::text as id, discovered_at::text as discovered_at
        from public.load_fresh_discovery_observations_page($1::timestamptz, $2::uuid, $3::integer)
      `, [beforeAt, beforeId, 1000]);
      pages += 1;
      seen.push(...page.rows.map((row) => row.id));
      if (page.rows.length < 1000) break;
      const last = page.rows[page.rows.length - 1]!;
      beforeAt = last.discovered_at;
      beforeId = last.id;
    }

    assert.equal(pages, 3);
    assert.equal(seen.length, 2_505);
    assert.equal(new Set(seen).size, 2_505);
    assert.deepEqual(new Set(seen), new Set(eligible.map((row) => row.id)));
  } finally {
    await db.close();
  }
});

test("P0.2 migration exposes only the two freshness statuses and a composite cursor index", () => {
  assert.match(migrationSql, /discovery_candidates_fresh_cursor_idx/i);
  assert.match(migrationSql, /\(discovered_at desc, id desc\)/i);
  assert.match(migrationSql, /discovery_status in \('accepted', 'promoted_to_source_offer'\)/i);
  assert.match(migrationSql, /\(dc\.discovered_at, dc\.id\) < \(p_before_discovered_at, p_before_id\)/i);
  assert.match(migrationSql, /security invoker/i);
  assert.match(migrationSql, /grant execute .* service_role/i);
});

test("P0.2 reconciler no longer deep-pages discovery_candidates by OFFSET", () => {
  const start = reconcilerSource.indexOf("export async function loadFreshObservations");
  const end = reconcilerSource.indexOf("async function applyUpdates", start);
  assert.ok(start >= 0 && end > start);
  const loader = reconcilerSource.slice(start, end);

  assert.match(loader, /\.rpc\("load_fresh_discovery_observations_page"/);
  assert.match(loader, /beforeDiscoveredAt = last\.discovered_at/);
  assert.match(loader, /beforeId = last\.id/);
  assert.doesNotMatch(loader, /\.range\(/);
  assert.doesNotMatch(loader, /offset=/);
});
