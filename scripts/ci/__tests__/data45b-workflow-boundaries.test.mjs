import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const workflow = ".github/workflows/data-4-5b-promoimmo-controlled-expansion-write.yml";
const after = ".github/workflows/data-4-5b-readonly-after.yml";
const writer = "scripts/audits/data-4-5b-promoimmo-controlled-expansion-write.ts";

test("4.5B privileged preflight never automatically runs on PR or main push", () => {
  const yaml = read(workflow);
  const contract = yaml.split("  contract:\n")[1]?.split("\n  live-read-only-preflight:")[0];
  const live = yaml.split("  live-read-only-preflight:\n")[1];
  assert.ok(contract && live, "required jobs must be retained");
  assert.match(yaml, /^  pull_request:/m);
  assert.match(yaml, /^  push:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /^concurrency:/m);
  assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\.|npm run build/);
  assert.match(contract, /node --test scripts\/ci\/__tests__\/data45b-workflow-boundaries\.test\.mjs/);
  assert.match(live, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.match(live, /needs: contract/);
  assert.match(live, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  assert.match(live, /DATA_4_5B_APPLY: "false"/);
  assert.match(live, /DATA_4_5B_CURRENT_SITEMAP_EVIDENCE: ""/);
  assert.match(live, /productionWriteCount|databaseWrites/);
});

test("4.5B AFTER performs no privileged operations", () => {
  const yaml = read(after);
  assert.match(yaml, /^  push:\n    branches: \[main\]\n    paths:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /npm run build/);
  assert.doesNotMatch(yaml, /SUPABASE_|NEON_|DATABASE_URL|secrets\.|method: (?:PATCH|POST|DELETE)/);
});

test("4.5B writer keeps explicit APPLY and three acknowledgements with no-evidence fail-close", () => {
  const code = read(writer);
  assert.match(code, /const APPLY = process\.env\.DATA_4_5B_APPLY === "true"/);
  assert.match(code, /if \(APPLY\) throw new Error\("DATA-4\.5B APPLY forbidden without current sitemap evidence"\)/);
  assert.match(code, /method: "PATCH"/);
  for (const ack of [
    "DATA_4_5B_CONFIRM_CURRENT_SITEMAP",
    "DATA_4_5B_CONFIRM_ROLLBACK_READY",
    "DATA_4_5B_CONFIRM_BOUNDED_WRITE",
  ]) assert.ok(code.includes(ack), `missing protected write acknowledgement ${ack}`);
  assert.match(code, /await writeManifests\(plan, evidenceDigest\)/);
  assert.match(code, /await verifyRollback\(applied\)/);
});
