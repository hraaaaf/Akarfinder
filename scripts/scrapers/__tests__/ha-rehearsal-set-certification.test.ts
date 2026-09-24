import assert from "node:assert/strict";
import test from "node:test";

import {
  certifyHaRehearsalSet,
  type HaRehearsalRecord,
} from "../../ha-dr/certify-ha-rehearsal-set.js";
import type { HaEvidenceBundleForCertification } from "../../ha-dr/certify-ha-evidence-bundle.js";

function passEvidence(
  id: string,
  timings: {
    rpo: number;
    failover: number;
    failback: number;
  },
): HaEvidenceBundleForCertification {
  return {
    schema_version: "1.0",
    run_id: id,
    phase: "FAILBACK",
    writer_state: "SUPABASE_PRIMARY",
    status: "PASS",
    application_commit: "a".repeat(40),
    database_schema_fingerprint: "schema-v1",
    approved_tables: ["property_listings"],
    verdict: "PASS",
    single_writer_proven: true,
    positions: {
      forward_start_lsn: "0/100",
      forward_end_lsn: "0/200",
      incident_start_lsn: "0/210",
      reverse_start_lsn: "0/300",
      reverse_target_lsn: "0/400",
      reverse_final_lsn: "0/450",
    },
    timings: {
      observed_rpo_seconds: timings.rpo,
      observed_failover_rto_seconds: timings.failover,
      observed_failback_rto_seconds: timings.failback,
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
        foreign_key_consistency: true,
        replica_identity: "default",
        sequence_safe: true,
        pass: true,
      },
    ],
    conflicts: 0,
    duplicates: 0,
    secrets_redacted: true,
  };
}

function completeSet(providerSpecific = true): HaRehearsalRecord[] {
  return [
    {
      rehearsal_id: "r1",
      provider_specific: providerSpecific,
      scenario_tags: ["INTERRUPTED_FORWARD"],
      evidence: passEvidence("r1", { rpo: 10, failover: 120, failback: 180 }),
    },
    {
      rehearsal_id: "r2",
      provider_specific: providerSpecific,
      scenario_tags: ["INTERRUPTED_REVERSE"],
      evidence: passEvidence("r2", { rpo: 20, failover: 240, failback: 210 }),
    },
    {
      rehearsal_id: "r3",
      provider_specific: providerSpecific,
      scenario_tags: ["PROLONGED_OUTAGE"],
      evidence: passEvidence("r3", { rpo: 30, failover: 600, failback: 300 }),
    },
  ];
}

test("three provider rehearsals with required scenarios can PASS", () => {
  const result = certifyHaRehearsalSet(completeSet());
  assert.equal(result.verdict, "PASS");
  assert.equal(result.rehearsal_count, 3);
  assert.equal(result.worst_observed_rpo_seconds, 30);
  assert.equal(result.worst_observed_failover_rto_seconds, 600);
  assert.equal(result.worst_observed_failback_rto_seconds, 300);
});

test("fewer than three rehearsals blocks certification", () => {
  const result = certifyHaRehearsalSet(completeSet().slice(0, 2));
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /rehearsal_count_insufficient/);
});

test("missing required scenario blocks certification", () => {
  const records = completeSet();
  records[2].scenario_tags = ["INTERRUPTED_FORWARD"];
  const result = certifyHaRehearsalSet(records);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /required_scenario_missing:PROLONGED_OUTAGE/);
});

test("isolated non-provider evidence can never production-certify", () => {
  const result = certifyHaRehearsalSet(completeSet(false));
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /provider_specific_evidence_missing:r1/);
});

test("RPO target miss blocks performance certification", () => {
  const records = completeSet();
  records[1].evidence.timings.observed_rpo_seconds = 61;
  const result = certifyHaRehearsalSet(records);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /rpo_target_missed:61:target_60/);
});

test("failover RTO target miss blocks performance certification", () => {
  const records = completeSet();
  records[2].evidence.timings.observed_failover_rto_seconds = 901;
  const result = certifyHaRehearsalSet(records);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /failover_rto_target_missed:901:target_900/);
});

test("duplicate rehearsal ids are a hard failure", () => {
  const records = completeSet();
  records[1].rehearsal_id = "r1";
  const result = certifyHaRehearsalSet(records);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /duplicate_rehearsal_id:r1/);
});

test("a failed underlying evidence bundle fails the rehearsal set", () => {
  const records = completeSet();
  records[0].evidence.single_writer_proven = false;
  const result = certifyHaRehearsalSet(records);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /single_writer_violation/);
});
