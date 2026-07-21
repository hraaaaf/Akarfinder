// AKARFINDER-REPOSITORY-BASELINE-RECONCILIATION-1 — P0.3
// Canonical workflow governance guard. The repository must never again let
// a workflow on one branch silently execute a moving fix/feat/poc branch.

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_DIR = join(process.cwd(), ".github", "workflows");
const NATIVE_INGESTION = "openserp-github-native-ingestion.yml";
const LEGACY_VERCEL_CRON = "openserp-ingestion-cron.yml";

function workflowFiles(): string[] {
  return readdirSync(WORKFLOW_DIR)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();
}

function readWorkflow(name: string): string {
  return readFileSync(join(WORKFLOW_DIR, name), "utf8").replace(/\r\n/g, "\n");
}

function loadOnBlock(content: string): string {
  const match = content.match(/(?:^|\n)on:\n([\s\S]*?)(?:\njobs:|\npermissions:)/);
  assert.ok(match, "expected an `on:` block in workflow file");
  return match![1];
}

test("workflows never hardcode moving fix/feat/poc checkout refs", () => {
  const violations: string[] = [];
  for (const name of workflowFiles()) {
    const content = readWorkflow(name);
    if (/^\s*ref:\s*(?:fix|feat|poc)\//m.test(content)) violations.push(name);
  }
  assert.deepEqual(violations, [], `cross-branch workflow refs are forbidden: ${violations.join(", ")}`);
});

test("native OpenSERP ingestion is the scheduled ingestion producer", () => {
  const content = readWorkflow(NATIVE_INGESTION);
  const onBlock = loadOnBlock(content);
  assert.match(onBlock, /^\s*schedule\s*:/m, `${NATIVE_INGESTION} must keep its schedule trigger`);
  assert.match(onBlock, /^\s*-\s*cron:\s*["']?\*\/30 \* \* \* \*["']?\s*$/m, `${NATIVE_INGESTION} must keep the 30-minute cron expression`);
});

test("legacy Vercel OpenSERP cron remains manual-only", () => {
  const content = readWorkflow(LEGACY_VERCEL_CRON);
  const onBlock = loadOnBlock(content);
  assert.ok(!/^\s*schedule\s*:/m.test(onBlock), `${LEGACY_VERCEL_CRON} must not have a schedule trigger`);
  assert.match(onBlock, /^\s*workflow_dispatch\s*:/m, `${LEGACY_VERCEL_CRON} must remain manually dispatchable`);
});

test("only one OpenSERP ingestion workflow carries an active schedule", () => {
  const scheduledIngestionWorkflows = workflowFiles().filter((name) => {
    const content = readWorkflow(name);
    if (!/openserp|ingestion/i.test(`${name}\n${content.slice(0, 500)}`)) return false;
    return /^\s*schedule\s*:/m.test(loadOnBlock(content));
  });
  assert.deepEqual(
    scheduledIngestionWorkflows,
    [NATIVE_INGESTION],
    `expected exactly one scheduled OpenSERP ingestion producer, found: ${scheduledIngestionWorkflows.join(", ")}`,
  );
});

test("scheduled native ingestion checkout follows the triggering ref", () => {
  const content = readWorkflow(NATIVE_INGESTION);
  assert.match(content, /uses:\s*actions\/checkout@v4/, "native ingestion must checkout repository content");
  assert.ok(!/^\s*ref\s*:/m.test(content), "native ingestion checkout must not override the triggering ref");
});
