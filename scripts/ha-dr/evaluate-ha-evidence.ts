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
  blockers: string[];
  failures: string[];
};

function isNonEmpty(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

function triState(
  value: boolean | null,
  missingReason: string,
  falseReason: string,
  blockers: string[],
  failures: string[],
): void {
  if (value === null) blockers.push(missingReason);
  else if (value === false) failures.push(falseReason);
}

export function evaluateHaEvidence(
  evidence: HaEvidenceInput,
): HaEvidenceEvaluation {
  const blockers: string[] = [];
  const failures: string[] = [];

  triState(
    evidence.single_writer_proven,
    "single_writer_proof_missing",
    "single_writer_violation",
    blockers,
    failures,
  );

  if (evidence.secrets_redacted !== true) {
    failures.push("secrets_not_redacted");
  }

  if (evidence.conflicts === null) {
    blockers.push("conflict_count_missing");
  } else if (evidence.conflicts !== 0) {
    failures.push("conflicts_detected");
  }

  if (evidence.duplicates === null) {
    blockers.push("duplicate_count_missing");
  } else if (evidence.duplicates !== 0) {
    failures.push("duplicates_detected");
  }

  if (evidence.table_evidence.length === 0) {
    blockers.push("table_evidence_empty");
  }

  for (const table of evidence.table_evidence) {
    const prefix = `table:${table.table}`;

    if (table.source_count === null || table.target_count === null) {
      blockers.push(`${prefix}:count_missing`);
    } else if (table.source_count !== table.target_count) {
      failures.push(`${prefix}:count_mismatch`);
    }

    if (
      !isNonEmpty(table.source_pk_digest) ||
      !isNonEmpty(table.target_pk_digest)
    ) {
      blockers.push(`${prefix}:pk_digest_missing`);
    } else if (table.source_pk_digest !== table.target_pk_digest) {
      failures.push(`${prefix}:pk_digest_mismatch`);
    }

    if (
      !isNonEmpty(table.source_content_digest) ||
      !isNonEmpty(table.target_content_digest)
    ) {
      blockers.push(`${prefix}:content_digest_missing`);
    } else if (table.source_content_digest !== table.target_content_digest) {
      failures.push(`${prefix}:content_digest_mismatch`);
    }

    triState(
      table.delete_parity,
      `${prefix}:delete_parity_missing`,
      `${prefix}:delete_parity_failed`,
      blockers,
      failures,
    );

    triState(
      table.timestamp_version_parity,
      `${prefix}:timestamp_version_parity_missing`,
      `${prefix}:timestamp_version_parity_failed`,
      blockers,
      failures,
    );

    triState(
      table.schema_fingerprint_match,
      `${prefix}:schema_fingerprint_missing`,
      `${prefix}:schema_fingerprint_mismatch`,
      blockers,
      failures,
    );

    if (!isNonEmpty(table.replica_identity)) {
      blockers.push(`${prefix}:replica_identity_missing`);
    }

    triState(
      table.sequence_safe,
      `${prefix}:sequence_safety_missing`,
      `${prefix}:sequence_safety_failed`,
      blockers,
      failures,
    );

    triState(
      table.pass,
      `${prefix}:table_verdict_missing`,
      `${prefix}:table_failed`,
      blockers,
      failures,
    );
  }

  if (
    evidence.timings.observed_rpo_seconds === null ||
    evidence.timings.observed_failover_rto_seconds === null ||
    evidence.timings.observed_failback_rto_seconds === null
  ) {
    blockers.push("rpo_rto_measurements_missing");
  }

  return {
    verdict:
      failures.length > 0
        ? "FAIL"
        : blockers.length > 0
          ? "BLOCKED"
          : "PASS",
    blockers,
    failures,
  };
}
