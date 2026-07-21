// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — section 13.
// Regression guard for the exact bug this mission fixes: a serverless
// invocation of the OpenSERP cron route crashed with
//   EROFS: read-only file system, open '/var/task/data/openserp/query-universe-v1.json'
// because run-orchestrator.ts rewrote its rotation and budget state back
// into local JSON files, which works under a local CLI (writable cwd) but
// not inside a Vercel function (read-only /var/task bundle). Rotation and
// budget state now live in PostgreSQL (lib/openserp-ingestion/state/*).
// These tests statically verify the forbidden write calls are gone and
// fail loudly if either is ever reintroduced into the serverless-reachable
// path.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ORCHESTRATOR_PATH = join(process.cwd(), "lib/openserp-ingestion/run-orchestrator.ts");
const QUERY_STATE_REPO_PATH = join(process.cwd(), "lib/openserp-ingestion/state/query-rotation-state-repository.ts");
const BUDGET_STATE_REPO_PATH = join(process.cwd(), "lib/openserp-ingestion/state/engine-budget-state-repository.ts");
const STATE_SERVICE_PATH = join(process.cwd(), "lib/openserp-ingestion/state/serverless-state-service.ts");

test("run-orchestrator.ts no longer defines saveUniverse (the function that caused the EROFS crash)", () => {
  const content = readFileSync(ORCHESTRATOR_PATH, "utf8");
  assert.ok(!content.includes("function saveUniverse"));
  assert.ok(!content.includes("saveUniverse("));
});

test("run-orchestrator.ts never writes the budget state to a local file", () => {
  const content = readFileSync(ORCHESTRATOR_PATH, "utf8");
  assert.ok(!content.includes("budgetStatePath"));
  assert.ok(!content.includes('data/openserp/engine-budget-state.json'));
});

test("run-orchestrator.ts's only remaining writeFileSync/mkdirSync call sites are guarded by input.rawResultsDir (local_cli_only, never reachable from the serverless route)", () => {
  const content = readFileSync(ORCHESTRATOR_PATH, "utf8");
  const lines = content.split("\n");
  const writeCallLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /\b(writeFileSync|writeFile|mkdirSync|mkdir|appendFile|rename|copyFile)\s*\(/.test(line));

  assert.ok(writeCallLines.length > 0, "expected to find the rawResultsDir-guarded write calls");

  for (const { line, index } of writeCallLines) {
    // Every remaining write call must appear within a few lines of the
    // "if (input.rawResultsDir)" guard that precedes it -- a blunt but
    // effective static check that a write call sits inside that specific
    // CLI-only conditional block, not on an unconditional path.
    const window = lines.slice(Math.max(0, index - 5), index + 1).join("\n");
    assert.ok(
      window.includes("input.rawResultsDir"),
      `write call "${line.trim()}" at line ${index + 1} is not guarded by input.rawResultsDir`,
    );
  }
});

test("run-orchestrator.ts imports the PostgreSQL-backed state service, not a file-based one", () => {
  const content = readFileSync(ORCHESTRATOR_PATH, "utf8");
  assert.ok(content.includes("hydrateRotationQueries"));
  assert.ok(content.includes("persistRotationUpdates"));
  assert.ok(content.includes("loadBudgetState"));
  assert.ok(content.includes("persistBudgetState"));
  assert.ok(content.includes("./state/serverless-state-service"));
});

test("query-rotation-state-repository.ts contains no filesystem write calls and no /tmp usage", () => {
  const content = readFileSync(QUERY_STATE_REPO_PATH, "utf8");
  assert.ok(!/\b(writeFileSync|writeFile|mkdirSync|mkdir)\s*\(/.test(content));
  assert.ok(!content.includes("/tmp"));
});

test("engine-budget-state-repository.ts contains no filesystem write calls and no /tmp usage", () => {
  const content = readFileSync(BUDGET_STATE_REPO_PATH, "utf8");
  assert.ok(!/\b(writeFileSync|writeFile|mkdirSync|mkdir)\s*\(/.test(content));
  assert.ok(!content.includes("/tmp"));
});

test("serverless-state-service.ts contains no filesystem write calls, no silent fallback to a file write, and no /tmp usage", () => {
  const content = readFileSync(STATE_SERVICE_PATH, "utf8");
  assert.ok(!/\b(writeFileSync|writeFile|mkdirSync|mkdir)\s*\(/.test(content));
  assert.ok(!content.includes("/tmp"));
});

test("query-universe-v1.json is read via readFileSync only -- never written back to by run-orchestrator.ts", () => {
  const content = readFileSync(ORCHESTRATOR_PATH, "utf8");
  const universeReadCount = (content.match(/readFileSync\(path, "utf8"\)/g) ?? []).length;
  assert.ok(universeReadCount >= 1, "expected loadUniverse() to still read the static catalog");
  assert.ok(!content.includes("universe.queries = universe.queries.map"));
});
