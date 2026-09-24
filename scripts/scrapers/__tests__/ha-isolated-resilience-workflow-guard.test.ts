import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../../.github/workflows/ha-isolated-resilience-rehearsal.yml", import.meta.url),
  "utf8",
);

test("resilience rehearsal is isolated and provider-secret free", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.match(workflow, /postgres:17/);
  assert.match(workflow, /two_disposable_postgresql_17_nodes/);
  assert.doesNotMatch(workflow, /SUPABASE_DATABASE_URL_DIRECT|NEON_DATABASE_URL_DIRECT/);
  assert.doesNotMatch(workflow, /property_listings|buyer_leads|thin_index_search_documents/);
});

test("resilience rehearsal uses a dedicated canary only", () => {
  assert.match(workflow, /akarfinder_ha_resilience_canary/);
  assert.match(workflow, /copy_data=false, origin=none/);
  assert.match(workflow, /provider_specific_certification: false/);
});

test("forward interruption proves stale state then catch-up", () => {
  assert.match(workflow, /alter subscription ha_resilience_forward_sub disable/);
  assert.match(workflow, /forward pause did not preserve stale target state/);
  assert.match(workflow, /alter subscription ha_resilience_forward_sub enable/);
  assert.match(workflow, /forward catch-up failed/);
  assert.match(workflow, /forward_insert_update_delete_catchup: "PASS"/);
});

test("reverse interruption proves stale state then catch-up", () => {
  assert.match(workflow, /alter subscription ha_resilience_reverse_sub disable/);
  assert.match(workflow, /reverse pause did not preserve stale source state/);
  assert.match(workflow, /alter subscription ha_resilience_reverse_sub enable/);
  assert.match(workflow, /reverse catch-up failed/);
  assert.match(workflow, /reverse_insert_update_delete_catchup: "PASS"/);
});

test("reverse rehearsal guards anti-loop and duplicate conflict risk", () => {
  assert.match(workflow, /reverse anti-loop duplicate\/conflict proof failed/);
  assert.match(workflow, /reverse_anti_loop_duplicate_conflict_proof: "PASS"/);
  assert.match(workflow, /select suborigin from pg_subscription/);
  assert.match(workflow, /reverse origin filter is not none/);
});

test("resilience artifact is traceable and secret guarded", () => {
  assert.match(workflow, /REHEARSAL_HEAD_SHA:/);
  assert.match(workflow, /github_execution_sha/);
  assert.match(workflow, /FORWARD_PAUSE_LSN/);
  assert.match(workflow, /FORWARD_CATCHUP_LSN/);
  assert.match(workflow, /REVERSE_PAUSE_LSN/);
  assert.match(workflow, /REVERSE_CATCHUP_LSN/);
  assert.match(workflow, /ISOLATED_RESILIENCE_PASS/);
  assert.match(workflow, /Secret-like material detected in resilience artifact/);
  assert.match(workflow, /retention-days: 30/);
});

test("resilience workflow cancels obsolete PR runs", () => {
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /ha-isolated-resilience-\$\{\{/);
});
