import assert from "node:assert/strict";
import test from "node:test";

import {
  certifyHaEvidenceBundle,
  type HaEvidenceBundleForCertification,
} from "../../ha-dr/certify-ha-evidence-bundle.js";

function passBundle(): HaEvidenceBundleForCertification {
  return {
    schema_version: "1.0",
    run_id: "TEST-FAILBACK-001",
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
      observed_rpo_seconds: 10,
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

test("complete PASS bundle certifies", () => {
  assert.deepEqual(certifyHaEvidenceBundle(passBundle()), {
    verdict: "PASS",
    blockers: [],
    failures: [],
  });
});

test("missing application commit blocks certification", () => {
  const bundle = passBundle();
  bundle.application_commit = null;

  const result = certifyHaEvidenceBundle(bundle);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.blockers.join("\n"), /application_commit_missing_or_invalid/);
  assert.match(result.failures.join("\n"), /status_pass_with_blocked_evidence/);
});

test("missing approved table evidence blocks certification", () => {
  const bundle = passBundle();
  bundle.approved_tables.push("listing_sources");

  const result = certifyHaEvidenceBundle(bundle);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.blockers.join("\n"), /approved_table_evidence_missing:listing_sources/);
});

test("unapproved table evidence is a hard failure", () => {
  const bundle = passBundle();
  bundle.table_evidence.push({
    ...bundle.table_evidence[0],
    table: "listing_sources",
  });

  const result = certifyHaEvidenceBundle(bundle);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /unapproved_table_evidence:listing_sources/);
});

test("duplicate table evidence is a hard failure", () => {
  const bundle = passBundle();
  bundle.table_evidence.push({ ...bundle.table_evidence[0] });

  const result = certifyHaEvidenceBundle(bundle);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /table_evidence_duplicated:property_listings/);
});

test("PASS status cannot declare a verdict inconsistent with computed evidence", () => {
  const bundle = passBundle();
  bundle.verdict = "BLOCKED";

  const result = certifyHaEvidenceBundle(bundle);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.failures.join("\n"), /declared_verdict_mismatch:BLOCKED:computed_PASS/);
});

test("BLOCKED status remains blocked rather than certifying", () => {
  const bundle = passBundle();
  bundle.status = "BLOCKED";
  bundle.verdict = "BLOCKED";

  const result = certifyHaEvidenceBundle(bundle);
  assert.equal(result.verdict, "BLOCKED");
  assert.match(result.blockers.join("\n"), /evidence_status_not_pass:BLOCKED/);
});


test("missing run id blocks certification", () => {
  const bundle = passBundle();
  bundle.run_id = "";

  const result = certifyHaEvidenceBundle(bundle);
  assert.equal(result.verdict, "FAIL");
  assert.match(result.blockers.join("\n"), /run_id_missing/);
  assert.match(result.failures.join("\n"), /status_pass_with_blocked_evidence/);
});
