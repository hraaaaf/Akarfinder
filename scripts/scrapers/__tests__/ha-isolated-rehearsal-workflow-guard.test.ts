import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../../.github/workflows/ha-isolated-rehearsal.yml", import.meta.url),
  "utf8",
);

const neonRuntimeWorkflow = readFileSync(
  new URL("../../../.github/workflows/neon-runtime-read-path.yml", import.meta.url),
  "utf8",
);

test("isolated HA rehearsal is constrained to manual or HA PR execution and provider-secret free", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /infra\/neon-migration-20260923/);
  assert.match(workflow, /ha-isolated-rehearsal\.yml/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.doesNotMatch(workflow, /SUPABASE_DATABASE_URL_DIRECT/);
  assert.doesNotMatch(workflow, /NEON_DATABASE_URL_DIRECT/);
});

test("isolated HA rehearsal uses two disposable PostgreSQL 17 nodes", () => {
  assert.match(workflow, /postgres:17/);
  assert.match(workflow, /akarfinder-ha-supabase-sim/);
  assert.match(workflow, /akarfinder-ha-neon-sim/);
  assert.match(workflow, /docker network create/);
});

test("isolated HA rehearsal feeds heredoc SQL through docker stdin", () => {
  assert.match(workflow, /docker exec -i "\$node" psql/);
});

test("isolated HA rehearsal mutates canary only", () => {
  assert.match(workflow, /akarfinder_ha_replication_canary/);
  assert.doesNotMatch(workflow, /property_listings|buyer_leads|seller_property_drafts|thin_index_search_documents/);
});

test("isolated HA rehearsal proves forward and reverse INSERT UPDATE DELETE", () => {
  assert.match(workflow, /forward INSERT did not replicate/);
  assert.match(workflow, /forward UPDATE did not replicate/);
  assert.match(workflow, /forward DELETE did not replicate/);
  assert.match(workflow, /reverse INSERT did not replicate/);
  assert.match(workflow, /reverse UPDATE did not replicate/);
  assert.match(workflow, /reverse DELETE did not replicate/);
});

test("isolated HA rehearsal exercises origin filtering without claiming provider proof", () => {
  assert.match(workflow, /with \(copy_data=false, origin=none\)/);
  assert.match(workflow, /provider_specific_certification: false/);
  assert.match(workflow, /Does not prove Supabase or Neon provider privileges/);
  assert.match(workflow, /Does not prove provider-specific origin behavior/);
});

test("isolated HA rehearsal requires cleanup and anti-loop proof", () => {
  assert.match(workflow, /anti-loop count proof failed/);
  assert.match(workflow, /cleanup failed/);
  assert.match(workflow, /anti_loop_count_proof: "PASS"/);
  assert.match(workflow, /cleanup: "PASS"/);
});

test("isolated HA rehearsal has a secret leakage guard", () => {
  assert.match(workflow, /Guard artifact against secret leakage/);
  assert.match(workflow, /Secret-like material detected/);
});


test("isolated HA rehearsal simulates application writer fencing", () => {
  assert.match(workflow, /create role ha_app_writer nologin/);
  assert.match(workflow, /revoke insert, update, delete .* from ha_app_writer/);
  assert.match(workflow, /grant insert, update, delete .* to ha_app_writer/);
  assert.match(workflow, /source app writer remained writable during FAILOVER_PREP/);
  assert.match(workflow, /target app writer was writable before promotion/);
  assert.match(workflow, /app writer remained writable during FAILBACK_FREEZE/);
  assert.match(workflow, /target app writer became writable after failback/);
  assert.match(workflow, /single_writer_contract: "DB_ROLE_FENCING_SIMULATED"/);
  assert.match(workflow, /failover_no_write_window: "PASS"/);
  assert.match(workflow, /failback_freeze: "PASS"/);
});


test("reverse incident mutations use the fenced application writer", () => {
  const reverse = workflow
    .split("- name: Prove reverse incident delta and no replay loop")[1]
    ?.split("- name: Freeze Neon-sim and fail back to Supabase-sim writer")[0] ?? "";
  assert.match(reverse, /set role ha_app_writer;\s*insert into public\.akarfinder_ha_replication_canary/);
  assert.match(reverse, /set role ha_app_writer;\s*update public\.akarfinder_ha_replication_canary/);
  assert.match(reverse, /set role ha_app_writer;\s*delete from public\.akarfinder_ha_replication_canary/);
});

test("isolated HA rehearsal measures the simulated failover transition at promotion time", () => {
  assert.match(workflow, /failover_decision_at=/);
  assert.match(workflow, /target_writer_promoted_at=/);
  assert.match(workflow, /isolated_failover_rto_ms=\/);
  assert.match(workflow, /isolated_failover_rto_ms: \\$isolated_failover_rto_ms\/);
  assert.doesNotMatch(workflow, /service_restored_at/);
});


test("HA CI cancels obsolete runs for the current PR", () => {
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /ha-isolated-logical-replication-rehearsal-\$\{\{/);
  assert.match(neonRuntimeWorkflow, /cancel-in-progress: true/);
  assert.match(neonRuntimeWorkflow, /neon-runtime-read-path-\$\{\{/);
});


test("isolated HA artifact records the PR head SHA and millisecond RTO", () => {
  assert.match(workflow, /REHEARSAL_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /application_commit: \$application_commit/);
  assert.match(workflow, /github_execution_sha: \$github_execution_sha/);
  assert.match(workflow, /failover_decision_epoch_ms/);
  assert.match(workflow, /target_writer_promoted_epoch_ms/);
  assert.match(workflow, /isolated_failover_rto_ms/);
  assert.doesNotMatch(workflow, /isolated_failover_rto_seconds/);
});
