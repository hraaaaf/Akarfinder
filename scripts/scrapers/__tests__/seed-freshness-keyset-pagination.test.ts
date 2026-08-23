import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { collectKeysetPages } from "../../../lib/seed-freshness/keyset-pagination";

test("keyset pagination crosses 8k rows without gaps or duplicates", async () => {
  const source = Array.from({ length: 10_005 }, (_, index) => ({
    key: `key-${String(index).padStart(5, "0")}`,
  }));
  const cursors: Array<string | null> = [];

  const rows = await collectKeysetPages(
    async (cursor, limit) => {
      cursors.push(cursor);
      return source.filter((row) => cursor === null || row.key > cursor).slice(0, limit);
    },
    (row) => row.key,
    1000,
  );

  assert.equal(rows.length, 10_005);
  assert.deepEqual(rows, source);
  assert.equal(new Set(rows.map((row) => row.key)).size, source.length);
  assert.equal(cursors.length, 11);
  assert.equal(cursors[0], null);
  assert.equal(cursors[9], "key-08999");
  assert.equal(cursors[10], "key-09999");
});

test("keyset pagination rejects a non-advancing full page", async () => {
  await assert.rejects(
    () => collectKeysetPages(
      async () => [{ key: "same" }, { key: "same" }],
      (row) => row.key,
      2,
    ),
    /KEYSET_CURSOR_NOT_ADVANCING/,
  );
});

test("reconciler uses indexed keyset cursors and contains no range pagination", () => {
  const source = readFileSync(
    join(process.cwd(), "scripts/openserp/reconcile-commoncrawl-seed-freshness.ts"),
    "utf8",
  );

  assert.equal(source.includes(".range("), false);
  assert.match(source, /\.order\("canonical_url", \{ ascending: true \}\)/);
  assert.match(source, /query = query\.gt\("canonical_url", cursor\)/);
  assert.match(source, /\.eq\("discovery_status", status\)/);
  assert.match(source, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(source, /query = query\.gt\("id", cursor\)/);
  assert.match(source, /loadFreshObservationsForStatus\("accepted"\)/);
  assert.match(source, /loadFreshObservationsForStatus\("promoted_to_source_offer"\)/);
});
