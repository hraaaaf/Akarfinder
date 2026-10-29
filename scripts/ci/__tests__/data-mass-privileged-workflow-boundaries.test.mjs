import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const audits = [
  { w: "data-mass-3a-minimal-listing-shadow.yml", job: "live-audit", source: "scripts/audits/data-mass-3a-minimal-listing-shadow.ts" },
  { w: "data-mass-3b-minimal-listing-projection-shadow.yml", job: "live-audit", source: "scripts/audits/data-mass-3b-minimal-listing-projection-shadow.ts" },
  { w: "data-mass-3c-canary-readiness-shadow.yml", job: "live-audit", source: "scripts/audits/data-mass-3c-canary-readiness-shadow.ts" },
  { w: "data-mass-4-reclassification-shadow.yml", job: "live-census", source: "scripts/data-mass/mass-reclassification-live.ts" },
  { w: "data-mass-2b-high-yield-sources.yml", job: "live-audit", source: "scripts/audits/data-mass-2b-high-yield-sources.ts" },
];
for (const item of audits) {
  test(`${item.w}: no credentials on PR, live only by explicit main dispatch`, () => {
    const yaml = read(`.github/workflows/${item.w}`);
    const contract = yaml.split("  contract:\n")[1]?.split(`\n  ${item.job}:`)[0];
    const live = yaml.split(`  ${item.job}:\n`)[1];
    assert.ok(contract && live);
    assert.match(yaml, /^  pull_request:/m);
    assert.match(yaml, /^  workflow_dispatch:/m);
    assert.doesNotMatch(yaml, /^  push:/m);
    assert.match(yaml, /^concurrency:/m);
    assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    assert.match(contract, /if: github\.event_name == 'pull_request' \|\| \(github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'\)/);
    assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\.|npm run build/);
    assert.match(contract, /node --test scripts\/ci\/__tests__\/data-mass-privileged-workflow-boundaries\.test\.mjs/);
    assert.match(live, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
    assert.match(live, /needs: contract/);
    assert.match(live, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);

    const source = read(item.source);
    assert.doesNotMatch(source, /\.(?:update|insert|upsert|delete|rpc)\s*\(/);
    assert.doesNotMatch(source, /method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i);
    assert.match(source, /databaseWrites:\s*0/);
  });
}

test("MASS shared AFTER builds only main with no database secrets", () => {
  const yaml = read(".github/workflows/data-mass-privileged-readonly-after.yml");
  assert.match(yaml, /^  push:\n    branches: \[main\]\n    paths:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /SUPABASE_|NEON_|DATABASE_URL|secrets\./);
});
