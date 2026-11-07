import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { config as vercelConfig } from "../../vercel.mjs";
// Keep false neighborhood price/POI claims out of every future PR.
import "../audits/vivre-ici-l1-truth-contract.mjs";

const workflow = readFileSync(".github/workflows/required-pr-gate.yml", "utf8");

test("required gate is a real GitHub Actions check for every PR to main", () => {
  assert.match(workflow, /^name: Required PR Gate$/m);
  assert.match(workflow, /^  pull_request:\s*\n    branches: \[main\]/m);
  assert.doesNotMatch(workflow, /^    paths:/m, "a required check must not be skipped on unrelated PRs");
  assert.match(workflow, /^  gate:\s*\n    name: gate$/m);
  assert.match(workflow, /^permissions:\s*\n  contents: read$/m);
  assert.match(workflow, /^  cancel-in-progress: true$/m);
  assert.doesNotMatch(workflow, /pull_request_target/, "untrusted PRs must not get privileged workflow context");
});

test("required gate actually checks source invariants and TypeScript", () => {
  assert.match(workflow, /node --test scripts\/ci\/required-pr-gate\.test\.mjs/);
  assert.match(workflow, /scripts\/governance\/product-constitution-guard\.mjs --base-root \. --candidate-root \./);
  assert.match(workflow, /npx tsc --noEmit/);
  assert.match(workflow, /run: npm ci/);
});

test("required gate preserves the owner's zero-auto-deployment rule", () => {
  assert.equal(vercelConfig.git.deploymentEnabled, false);
  assert.equal(existsSync("vercel.json"), false, "no second Vercel config");
});
