import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const MIGRATION = resolve("supabase/migrations/20260823120000_openserp_discovery_candidates_atomic_upsert.sql");
const WRITER = resolve("lib/openserp-ingestion/national-writer.ts");
const migrationSql = readFileSync(MIGRATION, "utf8");
const writerSource = readFileSync(WRITER, "utf8");

type CandidateRow = {
  provider: string;
  discovery_query: string;
  query_hash: string;
  result_rank: number;
  source_domain: string;
  source_url: string;
  canonical_url: string;
  title: string;
  snippet: string;
  discovered_at: string;
  last_seen_at: string;
  discovery_status: "accepted" | "rejected" | "unclassified";
  content_fingerprint: string;
  metadata: Record<string, unknown>;
};

function candidate(index: number, version: "seed" | "refresh" | "parallel-a" | "parallel-b"): CandidateRow {
  const refresh = version !== "seed";
  return {
    provider: "openserp",
    discovery_query: `query-${index}-${version}`,
    query_hash: `hash-${index}`,
    result_rank: refresh ? 10_000 + index : index,
    source_domain: refresh ? "changed.example.test" : "example.test",
    source_url: refresh ? `https://changed.example.test/raw/${index}` : `https://example.test/raw/${index}`,
    // One canonical URL with >1,000 provider/query keys reproduces the exact
    // production shape that overflowed the PostgREST lookup result limit.
    canonical_url: "https://example.test/listing/shared",
    title: `${version}-title-${index}`,
    snippet: `${version}-snippet-${index}`,
    discovered_at: refresh ? "2026-08-23T12:00:00.000Z" : "2026-08-22T12:00:00.000Z",
    last_seen_at: refresh ? "2026-08-23T12:00:00.000Z" : "2026-08-22T12:00:00.000Z",
    discovery_status: refresh ? "rejected" : "accepted",
    content_fingerprint: refresh ? `changed-fingerprint-${index}` : `seed-fingerprint-${index}`,
    metadata: { version, index },
  };
}

async function createDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;

    create table public.discovery_candidates (
      id bigint generated always as identity primary key,
      provider text not null,
      discovery_query text,
      query_hash text not null,
      result_rank integer,
      source_domain text not null,
      source_url text not null,
      canonical_url text,
      title text,
      snippet text,
      discovered_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      discovery_status text not null default 'discovered',
      compliance_status text,
      content_fingerprint text,
      metadata jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint discovery_candidates_status_check check (
        discovery_status in ('discovered','accepted','rejected','unclassified','expired','promoted_to_source_offer')
      )
    );

    create unique index discovery_candidates_idempotency_idx
      on public.discovery_candidates (provider, query_hash, canonical_url)
      where canonical_url is not null;
  `);
  await db.exec(migrationSql);
  return db;
}

async function upsert(db: PGlite, rows: CandidateRow[]) {
  const result = await db.query<{ affected: number }>(
    "select public.upsert_discovery_candidates_batch($1::jsonb) as affected",
    [JSON.stringify(rows)],
  );
  return Number(result.rows[0]?.affected ?? -1);
}

test("P0 atomic RPC handles >1000 existing conflicts without duplicate insertion", async () => {
  const db = await createDb();
  try {
    const seed = Array.from({ length: 1_200 }, (_, index) => candidate(index, "seed"));
    const refresh = Array.from({ length: 1_200 }, (_, index) => candidate(index, "refresh"));

    assert.equal(await upsert(db, seed), 1_200);
    assert.equal(await upsert(db, refresh), 1_200);

    const count = await db.query<{ count: number }>("select count(*)::int as count from public.discovery_candidates");
    assert.equal(Number(count.rows[0]?.count), 1_200);

    const sample = await db.query<{
      discovery_query: string;
      source_domain: string;
      source_url: string;
      discovered_at: string;
      content_fingerprint: string;
      result_rank: number;
      title: string;
      snippet: string;
      discovery_status: string;
      metadata: Record<string, unknown>;
    }>(`
      select discovery_query, source_domain, source_url, discovered_at::text, content_fingerprint,
             result_rank, title, snippet, discovery_status, metadata
      from public.discovery_candidates
      where provider = 'openserp' and query_hash = 'hash-0'
    `);
    const row = sample.rows[0];
    assert.ok(row);

    // Existing selective semantics: these fields stay from the first insert.
    assert.equal(row.discovery_query, "query-0-seed");
    assert.equal(row.source_domain, "example.test");
    assert.equal(row.source_url, "https://example.test/raw/0");
    assert.equal(row.content_fingerprint, "seed-fingerprint-0");
    assert.match(row.discovered_at, /^2026-08-22 12:00:00/);

    // Only the six fields previously refreshed by the writer are updated.
    assert.equal(row.result_rank, 10_000);
    assert.equal(row.title, "refresh-title-0");
    assert.equal(row.snippet, "refresh-snippet-0");
    assert.equal(row.discovery_status, "rejected");
    assert.deepEqual(row.metadata, { version: "refresh", index: 0 });
    const lastSeen = await db.query<{ last_seen_at: string }>(`
      select last_seen_at::text from public.discovery_candidates
      where provider = 'openserp' and query_hash = 'hash-0'
    `);
    assert.match(lastSeen.rows[0]?.last_seen_at ?? "", /^2026-08-23 12:00:00/);
  } finally {
    await db.close();
  }
});

test("P0 atomic RPC tolerates parallel callers on overlapping idempotency keys", async () => {
  const db = await createDb();
  try {
    const seed = Array.from({ length: 200 }, (_, index) => candidate(index, "seed"));
    assert.equal(await upsert(db, seed), 200);

    const a = Array.from({ length: 200 }, (_, index) => candidate(index, "parallel-a"));
    const b = Array.from({ length: 200 }, (_, index) => candidate(index, "parallel-b"));
    const results = await Promise.allSettled([upsert(db, a), upsert(db, b)]);

    assert.deepEqual(results.map((result) => result.status), ["fulfilled", "fulfilled"]);
    for (const result of results) {
      if (result.status === "fulfilled") assert.equal(result.value, 200);
    }

    const count = await db.query<{ count: number }>("select count(*)::int as count from public.discovery_candidates");
    assert.equal(Number(count.rows[0]?.count), 200);

    const final = await db.query<{ title: string }>(`
      select title from public.discovery_candidates
      where provider = 'openserp' and query_hash = 'hash-0'
    `);
    assert.ok(["parallel-a-title-0", "parallel-b-title-0"].includes(final.rows[0]?.title ?? ""));
  } finally {
    await db.close();
  }
});

test("P0 writer uses the atomic RPC and no longer performs the capped discovery lookup", () => {
  assert.match(writerSource, /\.rpc\("upsert_discovery_candidates_batch"/);
  assert.doesNotMatch(writerSource, /writer_discovery_candidates_lookup/);
  assert.doesNotMatch(writerSource, /writer_discovery_candidates_insert/);
  assert.doesNotMatch(writerSource, /writer_discovery_candidates_update/);

  assert.match(migrationSql, /on conflict \(provider, query_hash, canonical_url\)\s+where canonical_url is not null\s+do update set/i);
  for (const field of ["last_seen_at", "discovery_status", "result_rank", "title", "snippet", "metadata"]) {
    assert.match(migrationSql, new RegExp(`${field}\\s*=\\s*excluded\\.${field}`, "i"));
  }
});
