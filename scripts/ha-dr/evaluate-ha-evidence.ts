export type HaEvidenceVerdict = "PASS" | "FAIL" | "BLOCKED";

export type HaTableEvidence = {
  table: string;
  source_count: number | null;
  target_count: number | null;
  source_pk_digest: string | null;
  target_pk_digest: string | null;
  source_content_digest: string | null;
  target_content_digest: string | null;
  delete_parity: boolean | null;
  timestamp_version_parity: boolean | null;
  schema_fingerprint_match: boolean | null;
  replica_identity: string | null;
  sequence_safe: boolean | null;
  pass: boolean | null;
};

export type HaEvidenceInput = {
  single_writer_proven: boolean | null;
  table_evidence: HaTableEvidence[];
  conflicts: number | null;
  duplicates: number | null;
  secrets_redacted: boolean;
  timings: {
    observed_rpo_seconds: number | null;
    observed_failover_rto_seconds: number | null;
    observed_failback_rto_seconds: number | null;
  };
};

export type HaEvidenceEvaluation = {
  verdict: HaEvidenceVerdict;
  reasons: string[];
};

function isNonEmpty(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

export function evaluateHaEvidence(
  evidence: HaEvidenceInput,
): HaEvidenceEvaluation {
  const reasons: string[] = [];

  if (evidence.single_writer_proven !== true) {
    reasons.push("single_writer_not_proven");
  }

  if (evidence.secrets_redacted !== true) {
    reasons.push("secrets_not_redacted");
  }

  if (evidence.conflicts === null) {
    reasons.push("conflict_count_missing");
  } else if (evidence.conflicts !== 0) {
    reasons.push("conflicts_detected");
  }

  if (evidence.duplicates === null) {
    reasons.push("duplicate_count_missing");
  } else if (evidence.duplicates !== 0) {
    reasons.push("duplicates_detected");
  }

  for (const table of evidence.table_evidence) {
    const prefix = `table:${table.table}`;

    if (
      table.source_count === null ||
      table.target_count === null ||
      table.source_count !== table.target_count
    ) {
      reasons.push(`${prefix}:count_mismatch_or_missing`);
    }

    if (
      !isNonEmpty(table.source_pk_digest) ||
      !isNonEmpty(table.target_pk_digest) ||
      table.source_pk_digest !== table.target_pk_digest
    ) {
      reasons.push(`${prefix}:pk_digest_mismatch_or_missing`);
    }

    if (
      !isNonEmpty(table.source_content_digest) ||
      !isNonEmpty(table.target_content_digest) ||
      table.source_content_digest !== table.target_content_digest
    ) {
      reasons.push(`${prefix}:content_digest_mismatch_or_missing`);
    }

    if (table.delete_parity !== true) {
      reasons.push(`${prefix}:delete_parity_not_proven`);
    }

    if (table.timestamp_version_parity !== true) {
      reasons.push(`${prefix}:timestamp_version_parity_not_proven`);
    }

    if (table.schema_fingerprint_match !== true) {
      reasons.push(`${prefix}:schema_fingerprint_mismatch_or_missing`);
    }

    if (!isNonEmpty(table.replica_identity)) {
      reasons.push(`${prefix}:replica_identity_missing`);
    }

    if (table.sequence_safe !== true) {
      reasons.push(`${prefix}:sequence_safety_not_proven`);
    }

    if (table.pass !== true) {
      reasons.push(`${prefix}:table_not_marked_pass`);
    }
  }

  if (evidence.table_evidence.length === 0) {
    reasons.push("table_evidence_empty");
  }

  if (
    evidence.timings.observed_rpo_seconds === null ||
    evidence.timings.observed_failover_rto_seconds === null ||
    evidence.timings.observed_failback_rto_seconds === null
  ) {
    reasons.push("rpo_rto_measurements_missing");
  }

  return {
    verdict: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
