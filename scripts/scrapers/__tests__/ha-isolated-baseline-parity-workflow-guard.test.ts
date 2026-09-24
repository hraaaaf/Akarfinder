import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../../.github/workflows/ha-isolated-baseline-parity-rehearsal.yml", import.meta.url),
  "utf8",
);

test("HA03-A rehearsal is isolated and provider-secret free", () => {
  assert.match(workflow, /postgres:17/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.doesNotMatch(workflow, /SUPABASE_DATABASE_URL_DIRECT|NEON_DATABASE_URL_DIRECT/);
  assert.match(workflow, /provider_specific_certification: false/);
});

test("HA03-A proves exact baseline parity before adversarial mutations", () => {
  assert.match(workflow, /assert_table_equal/);
  assert.match(workflow, /exact_baseline_parity: "PASS"/);
  assert.match(workflow, /final_restored_parity: "PASS"/);
});

test("HA03-A detects count PK and content divergence", () => {
  assert.match(workflow, /count mismatch detector failed/);
  assert.match(workflow, /PK-set mismatch detector failed/);
  assert.match(workflow, /content digest mismatch detector failed/);
  assert.match(workflow, /count_mismatch_detector: "PASS"/);
  assert.match(workflow, /pk_set_mismatch_detector: "PASS"/);
  assert.match(workflow, /content_digest_mismatch_detector: "PASS"/);
});

test("HA03-A detects structural and replica identity divergence", () => {
  assert.match(workflow, /schema fingerprint mismatch detector failed/);
  assert.match(workflow, /replica identity mismatch detector failed/);
  assert.match(workflow, /pg_get_constraintdef/);
  assert.match(workflow, /pg_indexes/);
  assert.match(workflow, /relrowsecurity/);
  assert.match(workflow, /schema_fingerprint_mismatch_detector: "PASS"/);
  assert.match(workflow, /replica_identity_mismatch_detector: "PASS"/);
});

test("HA03-A detects sequence metadata and state divergence", () => {
  assert.match(workflow, /pg_sequences/);
  assert.match(workflow, /increment_by/);
  assert.match(workflow, /cache_size/);
  assert.match(workflow, /last_value/);
  assert.match(workflow, /alter sequence public\.ha_baseline_parent_id_seq increment by 2/);
  assert.match(workflow, /sequence metadata mismatch detector failed/);
  assert.match(workflow, /sequence_metadata_state_mismatch_detector: "PASS"/);
});

test("HA03-A restores parity after each detector probe", () => {
  assert.match(workflow, /delete from public\.ha_baseline_child where id=30/);
  assert.match(workflow, /set payload='child-10'/);
  assert.match(workflow, /insert into public\.ha_baseline_child values \(20,2,'child-20'/);
  assert.match(workflow, /drop column unexpected_note/);
  assert.match(workflow, /replica identity default/);
  assert.match(workflow, /increment by 1/);
});

test("HA03-A artifact is traceable and secret guarded", () => {
  assert.match(workflow, /REHEARSAL_HEAD_SHA:/);
  assert.match(workflow, /github_execution_sha/);
  assert.match(workflow, /ISOLATED_BASELINE_PARITY_PASS/);
  assert.match(workflow, /Secret-like material detected in baseline parity artifact/);
  assert.match(workflow, /retention-days: 30/);
});

test("HA03-A cancels obsolete PR runs", () => {
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /ha-isolated-baseline-parity-\$\{\{/);
});


test("HA03-A detects FK data inconsistency with the shared generator", () => {
  assert.match(workflow, /fk-consistency-query-generator\.sql/);
  assert.match(workflow, /fk_violation_count/);
  assert.match(workflow, /session_replication_role=replica/);
  assert.match(workflow, /parent_id bigint not null references public\.ha_baseline_parent\(id\)/);
  assert.match(workflow, /foreign-key consistency detector failed/);
  assert.match(workflow, /foreign_key_consistency_detector: "PASS"/);
});
