import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
for (const [workflow, job] of [
  [".github/workflows/data-4-3e-first-freshness-write-canary.yml", "live-dry-run"],
  [".github/workflows/data-4-3f-controlled-promotion-design.yml", "live-design-audit"],
]) {
  test(`${workflow}: elevated live evidence is manual main only`, () => {
    const yaml = read(workflow);
    const contract = yaml.split("  contract:\n")[1]?.split(`\n  ${job}:`)[0];
    const live = yaml.split(`  ${job}:\n`)[1];
    assert.ok(contract && live);
    assert.match(yaml, /^  pull_request:/m);
    assert.match(yaml, /^  workflow_dispatch:/m);
    assert.doesNotMatch(yaml, /^  push:/m);
    assert.match(yaml, /^concurrency:/m);
    assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    assert.match(contract, /if: github\.event_name == 'pull_request' \|\| \(github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'\)/);
    assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\.|npm run build/);
    assert.match(contract, /node --test scripts\/ci\/__tests__\/data43ef-workflow-boundaries\.test\.mjs/);
    assert.match(live, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
    assert.match(live, /needs: contract/);
    assert.match(live, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  });
}
test("shared E/F AFTER is read-only compile on main only", () => {
  const yaml = read(".github/workflows/data-4-3e-f-readonly-after.yml");
  assert.match(yaml, /^  push:\n    branches: \[main\]\n    paths:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /SUPABASE_|NEON_|DATABASE_URL|secrets\./);
});
test("privileged 4.3E/F audit entrypoints are GET-only", () => {
  for(const path of [
    "scripts/audits/data-4-3e-first-freshness-write-canary.ts",
    "scripts/audits/data-4-3f-controlled-promotion-design.ts",
  ]){
    const code = read(path);
    assert.match(code, /fetch\(/);
    assert.doesNotMatch(code, /method\s*:\s*["'](?:POST|PATCH|DELETE|PUT)["']/i);
    assert.doesNotMatch(code, /\.rpc\(|\.upsert\(|\.insert\(/);
    assert.match(code, /databaseWrites\s*:\s*0/);
  }
});
