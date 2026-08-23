import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadAllByIdCursor } from "../../openserp/reconcile-commoncrawl-seed-freshness";

function syntheticUuid(index: number): string {
  return `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;
}

test("keyset pagination traverses more than 12k rows without gaps or duplicates", async () => {
  const sourceRows = Array.from({ length: 12_345 }, (_, index) => ({
    id: syntheticUuid(index + 1),
    value: index + 1,
  }));
  const calls: Array<{ afterId: string | null; limit: number }> = [];

  const rows = await loadAllByIdCursor(async (afterId, limit) => {
    calls.push({ afterId, limit });
    const start = afterId === null
      ? 0
      : sourceRows.findIndex((row) => row.id > afterId);
    return start < 0 ? [] : sourceRows.slice(start, start + limit);
  }, 1_000);

  assert.equal(rows.length, sourceRows.length);
  assert.equal(new Set(rows.map((row) => row.id)).size, sourceRows.length);
  assert.deepEqual(rows.map((row) => row.id), sourceRows.map((row) => row.id));
  assert.equal(calls.length, 13);
  assert.equal(calls[8]?.afterId, syntheticUuid(8_000));
});

test("reconcile loaders use id keysets instead of PostgREST offset ranges", () => {
  const scriptPath = fileURLToPath(new URL("../../openserp/reconcile-commoncrawl-seed-freshness.ts", import.meta.url));
  const source = readFileSync(scriptPath, "utf8");

  assert.equal(source.includes(".range("), false);
  assert.equal((source.match(/\.order\("id"/g) ?? []).length, 2);
  assert.equal((source.match(/\.gt\("id", afterId\)/g) ?? []).length, 2);
  assert.match(source, /load source_offer_seeds after_id=/);
  assert.match(source, /load discovery_candidates after_id=/);
});
