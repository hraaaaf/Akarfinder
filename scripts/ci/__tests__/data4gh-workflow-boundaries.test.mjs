import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (name) => readFileSync(name, "utf8");
const workflowPaths = [
  ".github/workflows/data-4-3g-first-persistent-freshness-batch.yml",
  ".github/workflows/data-4-3h-controlled-expansion-to-500.yml",
];
const afterPath = ".github/workflows/data-4-3g-h-readonly-after.yml";

for (const path of workflowPaths) {
  test(`${path}: PR cannot access Supabase or run production build`, () => {
    const yaml = source(path);
    const contract = yaml.split("  contract:\n")[1]?.split("\n  live-dry-run:")[0];
    const live = yaml.split("  live-dry-run:\n")[1];
    assert.ok(contract && live, "required jobs must remain present");
    assert.match(yaml, /^  pull_request:/m);
    assert.match(yaml, /^  workflow_dispatch:/m);
    assert.doesNotMatch(yaml, /^  push:/m, "credential-bearing workflow cannot auto-run on push");
    assert.match(yaml, /^concurrency:/m);
    assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    assert.match(contract, /if: github\.event_name == 'pull_request' \|\| \(github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'\)/);
    assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\./, "PR contract must be secret-free");
    assert.doesNotMatch(contract, /npm run build/, "heavy build runs only AFTER");
    assert.match(contract, /node --test scripts\/ci\/__tests__\/data4gh-workflow-boundaries\.test\.mjs/);
    assert.match(live, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
    assert.match(live, /needs: contract/);
    assert.match(live, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  });
}

test("shared AFTER is main-only and contains no Supabase credentials or mutations", () => {
  const yaml = source(afterPath);
  assert.match(yaml, /^  push:\n    branches: \[main\]\n    paths:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /^concurrency:/m);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /SUPABASE_|NEON_|DATABASE_URL|secrets\.|method: (PATCH|POST|DELETE)/);
});

test("live audit entrypoints are GET-only and not write-capable", () => {
  for (const script of [
    "scripts/audits/data-4-3g-first-persistent-freshness-batch.ts",
    "scripts/audits/data-4-3h-controlled-expansion-to-500.ts",
  ]) {
    const code = source(script);
    assert.match(code, /async function restPage/);
    assert.match(code, /fetch\(url,/);
    assert.match(code, /mode: "DRY_RUN"|mode:"DRY_RUN"/);
    assert.doesNotMatch(code, /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
    assert.doesNotMatch(code, /\.from\([^)]+\)\.update\(|\.rpc\(|\.insert\(/);
  }
});
