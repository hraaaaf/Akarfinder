// OPENSERP-QUERY-UNIVERSE-REGIONAL-DOMAIN-CITY-SCOPING-1 -- ACTIVATE-1
// Proves the specific safety property this mission depends on: importing
// build-query-universe.ts never writes to
// data/openserp/query-universe-v1.json as a side effect. Deliberately uses
// ONLY a dynamic import inside the test body (no static top-level import of
// the module anywhere in this file) -- a static import is hoisted to
// module-evaluation time, before any code in this file could read a "before"
// hash, and would make this test unable to actually detect a regression of
// the entry-point guard around main(). Run in isolation (node:test gives
// every test file its own process/module registry), so this is genuinely
// the first time this process ever loads that module.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("importing build-query-universe.ts never writes to data/openserp/query-universe-v1.json", async () => {
  const universePath = join(process.cwd(), "data/openserp/query-universe-v1.json");
  const before = hashFile(universePath);

  const mod = await import("../../openserp/build-query-universe.js");
  assert.ok(typeof mod.buildUniverse === "function", "buildUniverse must be exported and importable");
  // Calling the pure function itself (not main()) must also never write.
  const universe = mod.buildUniverse();
  assert.ok(Array.isArray(universe) && universe.length > 0);

  const after = hashFile(universePath);
  assert.equal(before, after, "importing/calling buildUniverse() must never write to the Production query universe file");
});
