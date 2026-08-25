import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { dedupeByCanonicalFingerprint } from "../../../lib/openserp-ingestion/national-writer-dedupe";

const WRITER = resolve("lib/openserp-ingestion/national-writer.ts");
const writerSource = readFileSync(WRITER, "utf8");

type Row = { canonical_fingerprint: string; title: string };

async function createDb() {
  const db = new PGlite();
  await db.exec(`
    create table property_listings (
      id bigint generated always as identity primary key,
      canonical_fingerprint text not null unique,
      title text
    );
  `);
  return db;
}

async function upsertRows(db: PGlite, rows: Row[]) {
  const placeholders = rows.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(",");
  const params = rows.flatMap((row) => [row.canonical_fingerprint, row.title]);
  await db.query(
    `insert into property_listings (canonical_fingerprint, title) values ${placeholders}
     on conflict (canonical_fingerprint) do update set title = excluded.title`,
    params,
  );
}

test("raw property upsert reproduces PostgreSQL same-row conflict; dedupe removes it", async () => {
  const db = await createDb();
  try {
    const raw: Row[] = [
      { canonical_fingerprint: "same", title: "query-a" },
      { canonical_fingerprint: "same", title: "query-b" },
      { canonical_fingerprint: "other", title: "query-c" },
    ];

    await assert.rejects(upsertRows(db, raw), /cannot affect row a second time/i);

    const deduped = dedupeByCanonicalFingerprint(raw);
    assert.deepEqual(deduped, [
      { canonical_fingerprint: "same", title: "query-b" },
      { canonical_fingerprint: "other", title: "query-c" },
    ]);

    await upsertRows(db, deduped);
    const result = await db.query<{ canonical_fingerprint: string; title: string }>(
      "select canonical_fingerprint, title from property_listings order by canonical_fingerprint",
    );
    assert.deepEqual(result.rows, [
      { canonical_fingerprint: "other", title: "query-c" },
      { canonical_fingerprint: "same", title: "query-b" },
    ]);
  } finally {
    await db.close();
  }
});

test("national writer dedupes candidates before 25-row property upsert batches", () => {
  assert.match(writerSource, /const rawCandidates: OpenSerpListingCandidate\[\]/);
  assert.match(writerSource, /const candidates = dedupeByCanonicalFingerprint\(rawCandidates\)/);
  assert.match(writerSource, /for \(const batch of chunk\(candidates, 25\)\)/);
  assert.match(writerSource, /upsert\(propertyPayload, \{ onConflict: "canonical_fingerprint" \}\)/);
});
