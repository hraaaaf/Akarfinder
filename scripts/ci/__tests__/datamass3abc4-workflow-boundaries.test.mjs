import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const cases = [
  {
    workflow: ".github/workflows/data-mass-3a-minimal-listing-shadow.yml",
    job: "live-audit",
    script: "scripts/audits/data-mass-3a-minimal-listing-shadow.ts",
  },
  {
    workflow: ".github/workflows/data-mass-3b-minimal-listing-projection-shadow.yml",
    job: "live-audit",
    script: "scripts/audits/data-mass-3b-minimal-listing-projection-shadow.ts",
  },
  {
    workflow: ".github/workflows/data-mass-3c-canary-readiness-shadow.yml",
    job: "live-audit",
    script: "scripts/audits/data-mass-3c-canary-readiness-shadow.ts",
  },
  {
    workflow: ".github/workflows/data-mass-4-reclassification-shadow.yml",
    job: "live-census",
    script: "scripts/data-mass/mass-reclassification-live.ts",
  },
];

for (const { workflow, job, script } of cases) {
  test(`${workflow}: privileged data read cannot run automatically on a PR`, () => {
    const yaml = read(workflow);
    const contract = yaml.split("  contract:\n")[1]?.split(`\n  ${job}:`)[0];
    const live = yaml.split(`  ${job}:\n`)[1];
    assert.ok(contract && live, "contract and privileged audit must both remain");
    assert.match(yaml, /^  pull_request:/m);
    assert.match(yaml, /^  workflow_dispatch:/m);
    assert.doesNotMatch(yaml, /^  push:/m);
    assert.match(yaml, /^concurrency:/m);
    assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    assert.match(contract, /if: github\.event_name == 'pull_request' \|\| \(github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'\)/);
    assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\.|npm run build/);
    assert.match(contract, /node --test scripts\/ci\/__tests__\/datamass3abc4-workflow-boundaries\.test\.mjs/);
    assert.match(live, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
    assert.match(live, /needs: contract/);
    assert.match(live, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);

    const source = read(script);
    assert.match(source, /\.select\(/, "live audit must query via read-only selection");
    assert.match(source, /databaseWrites\s*:\s*0/);
    assert.doesNotMatch(source, /\.(?:insert|update|upsert|delete|rpc)\(/);
  });
}

test("MASS-3A manual main uses a real SHA when no PR context exists", () => {
  const yaml = read(".github/workflows/data-mass-3a-minimal-listing-shadow.yml");
  assert.match(yaml, /GITHUB_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
});

test("single scoped DATA-MASS AFTER runs on main without production secrets", () => {
  const yaml = read(".github/workflows/data-mass-3abc4-readonly-after.yml");
  assert.match(yaml, /^  push:\n    branches: \[main\]\n    paths:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /SUPABASE_|NEON_|DATABASE_URL|secrets\./);
  assert.doesNotMatch(yaml, /scripts\/data-mass\/\*\*/, "avoid unbounded main builds for unrelated data scripts");
});
