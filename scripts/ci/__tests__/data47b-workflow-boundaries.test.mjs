import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflowPath = ".github/workflows/data-4-7b-lsf-controlled-expansion-write.yml";
const certifierPath = "scripts/audits/data-4-7b-lsf-post-write-certification.ts";
const writerPath = "scripts/audits/data-4-7b-lsf-controlled-expansion-write.ts";
const read = (path) => readFileSync(path, "utf8");

test("4.7B service-role job is strictly manual on main, never a PR or push gate", () => {
  const yaml = read(workflowPath);
  const contract = yaml.split("  contract:\n")[1]?.split("\n  post-write-certification:")[0];
  const post = yaml.split("  post-write-certification:\n")[1];
  assert.ok(contract && post, "both contract and read-only post-certification jobs must exist");
  assert.match(yaml, /^  pull_request:/m);
  assert.match(yaml, /^  push:/m);
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.match(yaml, /^concurrency:/m);
  assert.match(yaml, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(contract, /SUPABASE_SERVICE_ROLE_KEY|secrets\./, "PR/push contract must not receive secrets");
  assert.match(contract, /node --test scripts\/ci\/__tests__\/data47b-workflow-boundaries\.test\.mjs/);
  assert.match(post, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.match(post, /needs: contract/);
  assert.match(post, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  assert.doesNotMatch(yaml, /run:\s*npx tsx scripts\/audits\/data-4-7b-lsf-controlled-expansion-write\.ts/);
});

test("post-write certifier only performs reads; writer remains confirmation-gated", () => {
  const certifier = read(certifierPath);
  const writer = read(writerPath);
  assert.match(certifier, /async function restPage/);
  assert.match(certifier, /POST_WRITE_CERTIFIED_READ_ONLY/);
  assert.doesNotMatch(certifier, /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.match(writer, /DATA_4_7B_APPLY === "true"/);
  for (const name of [
    "DATA_4_7B_CONFIRM_CURRENT_SITEMAP",
    "DATA_4_7B_CONFIRM_ROLLBACK_READY",
    "DATA_4_7B_CONFIRM_BOUNDED_WRITE",
  ]) assert.ok(writer.includes(name), `missing write acknowledgement ${name}`);
});
