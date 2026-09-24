import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHaEvidence,
  type HaEvidenceInput,
} from "../../ha-dr/evaluate-ha-evidence.js";

function passingEvidence(): HaEvidenceInput {
  return {
    single_writer_proven: true,
    conflicts: 0,
    duplicates: 0,
    secrets_redacted: true,
    timings: {
      observed_rpo_seconds: 5,
      observed_failover_rto_seconds: 120,
      observed_failback_rto_seconds: 180,
    },
    table_evidence: [
      {
        table: "property_listings",
        source_count: 10,
        target_count: 10,
        source_pk_digest: "pk",
        target_pk_digest: "pk",
        source_content_digest: "content",
        target_content_digest: "content",
        delete_parity: true,
        timestamp_version_parity: true,
        schema_fingerprint_match: true,
        replica_identity: "default",
        sequence_safe: true,
        pass: true,
      },
    ],
  };
}

test("complete consistent HA evidence evaluates PASS", () => {
  assert.deepEqual(evaluateHaEvidence(passingEvidence()), {
    verdict: "PASS",
    blockers: [],
    failures: [],
  });
});

test("missing measurements block certification rather than pretending failure", () => {
  const evidence = passingEvidence();
  evidence.timings.observed_rpo_seconds = null;

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /rpo_rto_measurements_missing/);
  assert.equal(result.failures.length, 0);
});

test("content divergence is a hard failure", () => {
  const evidence = passingEvidence();
  evidence.table_evidence[0].target_content_digest = "different";

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /content_digest_mismatch/);
});

test("split-brain evidence is a hard failure", () => {
  const evidence = passingEvidence();
  evidence.single_writer_proven = false;

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /single_writer_violation/);
});

test("conflicts or duplicates prevent PASS", () => {
  const conflict = passingEvidence();
  conflict.conflicts = 1;
  assert.equal(evaluateHaEvidence(conflict).verdict, "FAIL");

  const duplicate = passingEvidence();
  duplicate.duplicates = 1;
  assert.equal(evaluateHaEvidence(duplicate).verdict, "FAIL");
});

test("missing replica identity blocks certification", () => {
  const evidence = passingEvidence();
  evidence.table_evidence[0].replica_identity = null;

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /replica_identity_missing/);
});

test("sequence collision risk is a hard failure", () => {
  const evidence = passingEvidence();
  evidence.table_evidence[0].sequence_safe = false;

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /sequence_safety_failed/);
});
