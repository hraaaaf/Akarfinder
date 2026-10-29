import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const configs = [
  { workflow: ".github/workflows/data-4-3d-freshness-evidence-canary.yml", job: "live-dry-run", audit: "scripts/audits/data-4-3d-freshness-evidence-canary.ts" },
  { workflow: ".github/workflows/data-4-4a-second-reservoir-qualification.yml", job: "live-read-only", audit: "scripts/audits/data-4-4a-second-reservoir-qualification.ts" },
  { workflow: ".github/workflows/data-4-4b-promoimmo-revalidation-canary.yml", job: "live-dry-run", audit: "scripts/audits/data-4-4b-promoimmo-revalidation-canary.ts" },
];
for (const { workflow, job, audit } of configs) {
  test(`${workflow}: privileged live reads are main-manual-only`, () => {
    const yaml = read(workflow);
    const contract = yaml.split("  contract:\n")[1]?.split(`\n  ${job}:`)[0];
    const live = yaml.split(`  ${job}:\n`)[1];
    assert.ok(contract && live, "both jobs must exist");
    assert.match(yaml, /^  pull_request:/m);
    assert.match(yaml, /^  workflow_dispatch:/m);
    assert.doesNotMatch(yaml, /^  push:/m);
    assert.match(yaml, /^concurrency:/m);
    assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    assert.match(contract, /if: github\.event_name == 'pull_request' \|\| \(github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'\)/);
    assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\.|npm run build/);
    assert.match(contract, /node --test scripts\/ci\/__tests__\/data43d44ab-workflow-boundaries\.test\.mjs/);
    assert.match(live, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
    assert.match(live, /needs: contract/);
    assert.match(live, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
    const source = read(audit);
    assert.match(source, /fetch\(/);
    assert.match(source, /databaseWrites:\s*0/);
    assert.doesNotMatch(source, /method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i);
  });
}

test("one shared AFTER compiles without secrets or mutation", () => {
  const yaml = read(".github/workflows/data43d-44ab-readonly-after.yml");
  assert.match(yaml, /^  push:\n    branches: \[main\]\n    paths:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /SUPABASE_|NEON_|DATABASE_URL|secrets\./);
});
