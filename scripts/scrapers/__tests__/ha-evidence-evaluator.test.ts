import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHaEvidence,
  type HaEvidenceInput,
} from "../../ha-dr/evaluate-ha-evidence.js";

function baseEvidence(phase: HaEvidenceInput["phase"]): HaEvidenceInput {
  return {
    phase,
    single_writer_proven: true,
    conflicts: 0,
    duplicates: 0,
    secrets_redacted: true,
    positions: {
      forward_start_lsn: null,
      forward_end_lsn: null,
      incident_start_lsn: null,
      reverse_start_lsn: null,
      reverse_target_lsn: null,
      reverse_final_lsn: null,
    },
    timings: {
      observed_rpo_seconds: null,
      observed_failover_rto_seconds: null,
      observed_failback_rto_seconds: null,
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

test("BASELINE can PASS without failover timings", () => {
  assert.deepEqual(evaluateHaEvidence(baseEvidence("BASELINE")), {
    verdict: "PASS",
    blockers: [],
    failures: [],
  });
});

test("FORWARD_SYNC requires forward positions and measured RPO", () => {
  const evidence = baseEvidence("FORWARD_SYNC");
  let result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /forward_start_lsn_missing/);
  assert.match(result.blockers.join("\n"), /forward_end_lsn_missing/);
  assert.match(result.blockers.join("\n"), /observed_rpo_missing/);

  evidence.positions.forward_start_lsn = "0/100";
  evidence.positions.forward_end_lsn = "0/200";
  evidence.timings.observed_rpo_seconds = 5;

  result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "PASS");
});

test("FAILOVER requires incident boundary and measured failover RTO", () => {
  const evidence = baseEvidence("FAILOVER");
  evidence.positions.forward_end_lsn = "0/200";
  evidence.positions.incident_start_lsn = "0/210";
  evidence.timings.observed_rpo_seconds = 10;
  evidence.timings.observed_failover_rto_seconds = 120;

  assert.equal(evaluateHaEvidence(evidence).verdict, "PASS");
});

test("REVERSE_DELTA requires incident and reverse LSN boundaries", () => {
  const evidence = baseEvidence("REVERSE_DELTA");
  evidence.positions.incident_start_lsn = "0/210";
  evidence.positions.reverse_start_lsn = "0/300";
  evidence.positions.reverse_target_lsn = "0/400";

  assert.equal(evaluateHaEvidence(evidence).verdict, "PASS");
});

test("FAILBACK requires final reverse LSN and all measured timings", () => {
  const evidence = baseEvidence("FAILBACK");
  evidence.positions.reverse_start_lsn = "0/300";
  evidence.positions.reverse_target_lsn = "0/400";
  evidence.positions.reverse_final_lsn = "0/450";
  evidence.timings.observed_rpo_seconds = 10;
  evidence.timings.observed_failover_rto_seconds = 120;
  evidence.timings.observed_failback_rto_seconds = 180;

  assert.equal(evaluateHaEvidence(evidence).verdict, "PASS");
});

test("content divergence is a hard failure", () => {
  const evidence = baseEvidence("BASELINE");
  evidence.table_evidence[0].target_content_digest = "different";

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /content_digest_mismatch/);
});

test("split-brain evidence is a hard failure", () => {
  const evidence = baseEvidence("BASELINE");
  evidence.single_writer_proven = false;

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /single_writer_violation/);
});

test("conflicts or duplicates prevent PASS", () => {
  const conflict = baseEvidence("BASELINE");
  conflict.conflicts = 1;
  assert.equal(evaluateHaEvidence(conflict).verdict, "FAIL");

  const duplicate = baseEvidence("BASELINE");
  duplicate.duplicates = 1;
  assert.equal(evaluateHaEvidence(duplicate).verdict, "FAIL");
});

test("missing replica identity blocks certification", () => {
  const evidence = baseEvidence("BASELINE");
  evidence.table_evidence[0].replica_identity = null;

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /replica_identity_missing/);
});

test("sequence collision risk is a hard failure", () => {
  const evidence = baseEvidence("BASELINE");
  evidence.table_evidence[0].sequence_safe = false;

  const result = evaluateHaEvidence(evidence);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /sequence_safety_failed/);
});
