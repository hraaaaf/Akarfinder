import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runnerPath = new URL("../universal-candidate-promotion-live.ts", import.meta.url);

test("M1 live scan uses snapshot-bounded keyset pagination and never OFFSET/range pagination", async () => {
  const source = await readFile(runnerPath, "utf8");
  assert.ok(source.includes('.lte("created_at", snapshotCutoff)'));
  assert.ok(source.includes('baseQuery.gt("id", cursor)'));
  assert.ok(source.includes('pagination: "keyset_uuid"'));
  assert.ok(source.includes('snapshotBounded: true'));
  assert.ok(source.includes('keysetPagination: true'));
  assert.ok(!source.includes(".range("));
});
