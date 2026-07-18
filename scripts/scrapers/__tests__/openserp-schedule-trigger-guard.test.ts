// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 2.
// Regression guard for the exact incident this mission fixes: the
// workflow's `schedule` trigger went live on the default branch and fired
// automatically every 30 minutes, colliding with a manual real-run
// validation attempt. The schedule trigger has been deliberately removed
// (see .github/workflows/openserp-ingestion-cron.yml's own header
// comment) until a future mission explicitly re-authorizes it. This test
// fails loudly if the schedule trigger is ever silently reintroduced, and
// confirms workflow_dispatch (the only sanctioned manual trigger) is
// still present.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_PATH = join(process.cwd(), ".github/workflows/openserp-ingestion-cron.yml");

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function loadOnBlock(content: string): string {
  const match = content.match(/\non:\n([\s\S]*?)\njobs:/);
  assert.ok(match, "expected an `on:` block followed by a `jobs:` block in the workflow file");
  return match![1];
}

test("openserp-ingestion-cron.yml has no `schedule` trigger", () => {
  const content = normalizeLineEndings(readFileSync(WORKFLOW_PATH, "utf8"));
  const onBlock = loadOnBlock(content);
  assert.ok(
    !/^\s*schedule\s*:/m.test(onBlock),
    "the `schedule` trigger must stay removed until a future mission explicitly re-authorizes the unattended cadence (see OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1)",
  );
});

test("openserp-ingestion-cron.yml still allows workflow_dispatch (manual trigger)", () => {
  const content = normalizeLineEndings(readFileSync(WORKFLOW_PATH, "utf8"));
  const onBlock = loadOnBlock(content);
  assert.ok(/^\s*workflow_dispatch\s*:/m.test(onBlock), "workflow_dispatch must remain available for controlled manual runs");
});

test("no other schedule-like trigger (cron string) appears anywhere in the workflow file", () => {
  const content = normalizeLineEndings(readFileSync(WORKFLOW_PATH, "utf8"));
  // Matches an actual YAML `cron:` mapping key (not the prose in comments
  // that merely mentions "cron" or shows the old syntax as documentation).
  assert.ok(!/^\s*-\s*cron\s*:/m.test(content), "no active `- cron: ...` schedule entry may exist anywhere in this file");
});
