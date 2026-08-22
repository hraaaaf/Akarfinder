import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runnerPath = new URL("../external-index-m2-canary-plan-live.ts", import.meta.url);
const workflowPath = new URL("../../../.github/workflows/mass-index-m1-certification.yml", import.meta.url);

test("M2 final certification uses bounded accepted cohorts instead of rescanning the full reservoir", async () => {
  const runner = await readFile(runnerPath, "utf8");
  const workflow = await readFile(workflowPath, "utf8");
  assert.ok(runner.includes('.eq("discovery_status", "accepted")'));
  assert.ok(runner.includes("PER_PROVIDER_LIMIT = 500"));
  assert.ok(runner.includes("CANARY_MAX_ROWS = 10"));
  assert.ok(runner.includes('NATIVE_PROVIDERS = ["openserp", "serper_mass_harvest"]'));
  assert.ok(runner.includes("buildUniversalCandidatePromotionManifest"));
  assert.ok(runner.includes("buildExternalIndexSeedWritePlan"));
  assert.ok(workflow.includes("external-index-m2-canary-plan-live.ts"));
  assert.ok(!workflow.includes("npx tsx scripts/data-mass/universal-candidate-promotion-live.ts"));
  assert.ok(!workflow.includes("external-index-seed-write-plan-live.ts"));
});
