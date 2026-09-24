import {
  evaluateHaEvidence,
  type HaEvidenceInput,
  type HaEvidenceVerdict,
} from "./evaluate-ha-evidence.js";

export type HaEvidenceStatus =
  | "NOT_RUN"
  | "RUNNING"
  | "PASS"
  | "FAIL"
  | "BLOCKED";

export type HaDeclaredVerdict =
  | "NOT_RUN"
  | "PASS"
  | "FAIL"
  | "BLOCKED";

export type HaEvidenceBundleForCertification = HaEvidenceInput & {
  schema_version: "1.0";
  run_id: string;
  status: HaEvidenceStatus;
  application_commit: string | null;
  database_schema_fingerprint: string | null;
  approved_tables: string[];
  verdict: HaDeclaredVerdict;
};

export type HaEvidenceCertification = {
  verdict: HaEvidenceVerdict;
  blockers: string[];
  failures: string[];
};

function nonEmpty(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }

  return [...duplicates].sort();
}

export function certifyHaEvidenceBundle(
  bundle: HaEvidenceBundleForCertification,
): HaEvidenceCertification {
  const evaluated = evaluateHaEvidence(bundle);
  const blockers = [...evaluated.blockers];
  const failures = [...evaluated.failures];

  if (bundle.schema_version !== "1.0") {
    failures.push("unsupported_schema_version");
  }

  if (bundle.run_id.trim().length === 0) {
    blockers.push("run_id_missing");
  }

  if (
    !nonEmpty(bundle.application_commit) ||
    !/^[0-9a-f]{40}$/.test(bundle.application_commit)
  ) {
    blockers.push("application_commit_missing_or_invalid");
  }

  if (!nonEmpty(bundle.database_schema_fingerprint)) {
    blockers.push("database_schema_fingerprint_missing");
  }

  if (bundle.approved_tables.length === 0) {
    blockers.push("approved_tables_empty");
  }

  for (const table of duplicateValues(bundle.approved_tables)) {
    failures.push(`approved_table_duplicated:${table}`);
  }

  const evidenceTables = bundle.table_evidence.map((table) => table.table);

  for (const table of duplicateValues(evidenceTables)) {
    failures.push(`table_evidence_duplicated:${table}`);
  }

  const approved = new Set(bundle.approved_tables);
  const evidenced = new Set(evidenceTables);

  for (const table of approved) {
    if (!evidenced.has(table)) {
      blockers.push(`approved_table_evidence_missing:${table}`);
    }
  }

  for (const table of evidenced) {
    if (!approved.has(table)) {
      failures.push(`unapproved_table_evidence:${table}`);
    }
  }

  if (bundle.status === "FAIL") {
    failures.push("evidence_status_fail");
  } else if (bundle.status !== "PASS") {
    blockers.push(`evidence_status_not_pass:${bundle.status}`);
  }

  const preliminaryVerdict: HaEvidenceVerdict =
    failures.length > 0
      ? "FAIL"
      : blockers.length > 0
        ? "BLOCKED"
        : "PASS";

  if (bundle.status === "PASS") {
    if (preliminaryVerdict !== "PASS") {
      failures.push(
        `status_pass_with_${preliminaryVerdict.toLowerCase()}_evidence`,
      );
    }

    if (bundle.verdict !== preliminaryVerdict) {
      failures.push(
        `declared_verdict_mismatch:${bundle.verdict}:computed_${preliminaryVerdict}`,
      );
    }
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
