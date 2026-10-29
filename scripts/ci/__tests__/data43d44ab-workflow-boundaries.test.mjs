import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const targets = [
  [".github/workflows/data-4-3d-freshness-evidence-canary.yml", "live-dry-run"],
  [".github/workflows/data-4-4a-second-reservoir-qualification.yml", "live-read-only"],
  [".github/workflows/data-4-4b-promoimmo-revalidation-canary.yml", "live-dry-run"],
];

for (const [workflow, privilegedJob] of targets) {
  test(`${workflow}: service-role job must be manual main only`, () => {
    const yaml = read(workflow);
    const contract = yaml.split("  contract:\n")[1]?.split(`\n  ${privilegedJob}:`)[0];
    const live = yaml.split(`  ${privilegedJob}:\n`)[1];
    assert.ok(contract && live, "existing contract and privileged audit jobs must remain");
    assert.match(yaml, /^  pull_request:/m);
    assert.match(yaml, /^  workflow_dispatch:/m);
    assert.doesNotMatch(yaml, /^  push:/m, "credentialed workflow cannot auto-run on push");
    assert.match(yaml, /^concurrency:/m);
    assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    assert.match(contract, /if: github\.event_name == 'pull_request' \|\| \(github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'\)/);
    assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\.|npm run build/);
    assert.match(contract, /node --test scripts\/ci\/__tests__\/data43d44ab-workflow-boundaries\.test\.mjs/);
    assert.match(live, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
    assert.match(live, /needs: contract/);
    assert.match(live, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  });
}

test("shared AFTER compiles only on main, without elevated credentials", () => {
  const yaml = read(".github/workflows/data43d-44ab-readonly-after.yml");
  assert.match(yaml, /^  push:\n    branches: \[main\]\n    paths:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /SUPABASE_|NEON_|DATABASE_URL|secrets\./);
});

test("audited 4.3D and 4.4A/B live entrypoints have no write methods", () => {
  for (const path of [
    "scripts/audits/data-4-3d-freshness-evidence-canary.ts",
    "scripts/audits/data-4-4a-second-reservoir-qualification.ts",
    "scripts/audits/data-4-4b-promoimmo-revalidation-canary.ts",
  ]) {
    const code = read(path);
    assert.match(code, /fetch\(/);
    assert.match(code, /databaseWrites\s*:\s*0/);
    assert.doesNotMatch(code, /method\s*:\s*["'](?:PATCH|POST|PUT|DELETE)["']/i);
    assert.doesNotMatch(code, /\.insert\(|\.upsert\(|\.rpc\(/);
  }
});
