import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const commonCrawl = read(".github/workflows/commoncrawl-mass-seed-harvest.yml");
const openserp = read(".github/workflows/openserp-github-native-ingestion.yml");
const triggers = (workflow) => {
  const from = workflow.indexOf("\non:\n");
  const to = workflow.indexOf("\npermissions:", from);
  assert.ok(from >= 0 && to > from, "workflow must have a bounded event block");
  return workflow.slice(from, to);
};

test("Common Crawl has no unattended write trigger or reachable apply branch", () => {
  const events = triggers(commonCrawl);
  assert.match(events, /^  pull_request:/m);
  assert.match(events, /^  workflow_dispatch:/m);
  assert.doesNotMatch(events, /^  (?:schedule|push):/m);
  assert.doesNotMatch(events, /^\s+- apply\s*$/m);
  assert.match(commonCrawl, /CC_APPLY=0/);
  assert.doesNotMatch(commonCrawl, /CC_APPLY=1|--apply|git push/);
  assert.match(commonCrawl, /github\.ref == 'refs\/heads\/main'/);
});

test("Common Crawl PR never executes the service-role live audit", () => {
  const start = commonCrawl.indexOf("- name: Read-only live Source Registry projection");
  assert.ok(start > 0);
  const audit = commonCrawl.slice(start, commonCrawl.indexOf("\n      - name:", start + 1));
  assert.match(audit, /github\.event_name == 'workflow_dispatch'/);
  assert.match(audit, /github\.ref == 'refs\/heads\/main'/);
  assert.match(audit, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(commonCrawl, /node --test scripts\/ci\/guard-unattended-ingestion\.test\.mjs/);
});

test("OpenSERP remains manual main-only, with neither cron nor apply mode", () => {
  const events = triggers(openserp);
  assert.match(events, /^  workflow_dispatch:/m);
  assert.doesNotMatch(events, /^  (?:schedule|push|pull_request):/m);
  assert.doesNotMatch(events, /^\s+- cron\s*$/m);
  assert.match(openserp, /github\.ref == 'refs\/heads\/main'/);
  assert.match(openserp, /MODE="dry-run"/);
  assert.match(openserp, /SEED_MODE="dry-run"/);
  assert.match(openserp, /WAVES=1/);
  assert.doesNotMatch(openserp, /--apply|MODE="cron"|SEED_MODE="apply"/);
});


test("P0.1 Source Registry audit requires main AFTER rather than PR credentials", () => {
  const gate = read(".github/workflows/p0-1-mass-index-source-registry-gate.yml");
  const start = gate.indexOf("- name: Read-only live Source Registry audit");
  assert.ok(start > 0);
  const block = gate.slice(start, gate.indexOf("\n      - name:", start + 1));
  assert.match(block, /github\.event_name == 'push'/);
  assert.match(block, /github\.ref == 'refs\/heads\/main'/);
  assert.match(block, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(gate, /if: always\(\) && github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
});
