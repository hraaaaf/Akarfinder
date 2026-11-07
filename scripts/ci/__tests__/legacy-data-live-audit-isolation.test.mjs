import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflows = [
  "data-4-9b-high-capacity-structural-detail-qualification.yml",
  "data-mass-1-reservoir-qualification.yml",
  "data-mass-2a-source-factory-engine.yml",
  "data-mass-2c-mid-yield-sources.yml",
  "data-mass-2f-final-certification.yml",
];

const contractGate = "if: github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main')";
const liveGate = "if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'";

for (const filename of workflows) {
  test(`${filename}: PR stays offline, manual main-only has privileged live audit`, () => {
    const yaml = readFileSync(`.github/workflows/${filename}`, "utf8");
    const [events, jobs] = yaml.split(/\njobs:\s*\n/);
    assert.ok(events && jobs, "Workflow must define events and jobs");
    assert.match(events, /\non:\s*\n/);
    assert.match(events, /\n  pull_request:\s*\n/);
    assert.match(events, /\n  workflow_dispatch:\s*(?:\{\})?\s*\n/);
    assert.doesNotMatch(events, /\n  push:\s*\n|\n  schedule:\s*\n/);
    assert.doesNotMatch(events, /"docs\/ROADMAP\.md"|"docs\/SESSION\.md"|"README\.md"/);
    assert.ok(events.includes('"scripts/ci/__tests__/legacy-data-live-audit-isolation.test.mjs"'));
    assert.ok(events.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}"),
      "Only PR runs may cancel previous runs");

    const [contract, live] = jobs.split(/\n  live-(?:audit|qualification):\s*\n/);
    assert.ok(contract && live, "Contract and live jobs must remain distinct");
    assert.ok(contract.includes(contractGate));
    assert.ok(contract.includes("node --test scripts/ci/__tests__/legacy-data-live-audit-isolation.test.mjs"));
    assert.doesNotMatch(contract, /secrets\.|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_URL|npm run build/,
      "PR contracts must have no credentials or heavy build");
    assert.ok(live.includes(liveGate));
    assert.match(live, /secrets\.SUPABASE_URL/);
    assert.match(live, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
    assert.ok(!live.includes("github.event_name == 'pull_request'"),
      "Privileged job must never admit PR");
  });
}

test("shared AFTER performs one full build on main only, without service-role secrets", () => {
  const yaml = readFileSync(".github/workflows/data-mass-legacy-build-after.yml", "utf8");
  const [events, jobs] = yaml.split(/\njobs:\s*\n/);
  assert.ok(events && jobs);
  assert.match(events, /\n  push:\s*\n/);
  assert.match(events, /\n    branches:\s*\[main\]/);
  assert.match(events, /\n  workflow_dispatch:\s*\{\}/);
  assert.doesNotMatch(events, /\n  pull_request:\s*\n/);
  assert.ok(jobs.includes("if: github.ref == 'refs/heads/main'"));
  assert.ok(jobs.includes("npm run build"));
  assert.ok(jobs.includes("npx tsc --noEmit"));
  assert.ok(jobs.includes("node --test scripts/ci/__tests__/legacy-data-live-audit-isolation.test.mjs"));
  assert.doesNotMatch(jobs, /secrets\.|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_URL/);
  assert.ok(events.includes("contents: read"));
});
