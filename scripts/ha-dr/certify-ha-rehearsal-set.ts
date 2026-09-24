import {
  certifyHaEvidenceBundle,
  type HaEvidenceBundleForCertification,
} from "./certify-ha-evidence-bundle.js";

export type HaRequiredRehearsalScenario =
  | "INTERRUPTED_FORWARD"
  | "INTERRUPTED_REVERSE"
  | "PROLONGED_OUTAGE";

export type HaRehearsalRecord = {
  rehearsal_id: string;
  provider_specific: boolean;
  scenario_tags: HaRequiredRehearsalScenario[];
  evidence: HaEvidenceBundleForCertification;
};

export type HaRehearsalSetCertification = {
  verdict: "PASS" | "FAIL" | "BLOCKED";
  blockers: string[];
  failures: string[];
  rehearsal_count: number;
  worst_observed_rpo_seconds: number | null;
  worst_observed_failover_rto_seconds: number | null;
  worst_observed_failback_rto_seconds: number | null;
};

const REQUIRED_SCENARIOS: readonly HaRequiredRehearsalScenario[] = [
  "INTERRUPTED_FORWARD",
  "INTERRUPTED_REVERSE",
  "PROLONGED_OUTAGE",
];

function maxFinite(values: Array<number | null>): number | null {
  const finite = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value >= 0,
  );
  return finite.length > 0 ? Math.max(...finite) : null;
}

export function certifyHaRehearsalSet(
  records: HaRehearsalRecord[],
): HaRehearsalSetCertification {
  const blockers: string[] = [];
  const failures: string[] = [];

  if (records.length < 3) {
    blockers.push(`rehearsal_count_insufficient:${records.length}:required_3`);
  }

  const seenIds = new Set<string>();
  for (const record of records) {
    if (!record.rehearsal_id.trim()) {
      blockers.push("rehearsal_id_missing");
    } else if (seenIds.has(record.rehearsal_id)) {
      failures.push(`duplicate_rehearsal_id:${record.rehearsal_id}`);
    } else {
      seenIds.add(record.rehearsal_id);
    }

    if (!record.provider_specific) {
      blockers.push(
        `provider_specific_evidence_missing:${record.rehearsal_id || "unknown"}`,
      );
    }

    if (record.evidence.phase !== "FAILBACK") {
      blockers.push(
        `complete_failback_evidence_missing:${record.rehearsal_id || "unknown"}`,
      );
    }

    const evaluated = certifyHaEvidenceBundle(record.evidence);
    for (const blocker of evaluated.blockers) {
      blockers.push(`rehearsal:${record.rehearsal_id || "unknown"}:${blocker}`);
    }
    for (const failure of evaluated.failures) {
      failures.push(`rehearsal:${record.rehearsal_id || "unknown"}:${failure}`);
    }
  }

  const coveredScenarios = new Set(
    records.flatMap((record) => record.scenario_tags),
  );
  for (const scenario of REQUIRED_SCENARIOS) {
    if (!coveredScenarios.has(scenario)) {
      blockers.push(`required_scenario_missing:${scenario}`);
    }
  }

  const worstRpo = maxFinite(
    records.map((record) => record.evidence.timings.observed_rpo_seconds),
  );
  const worstFailoverRto = maxFinite(
    records.map(
      (record) => record.evidence.timings.observed_failover_rto_seconds,
    ),
  );
  const worstFailbackRto = maxFinite(
    records.map(
      (record) => record.evidence.timings.observed_failback_rto_seconds,
    ),
  );

  if (worstRpo === null) {
    blockers.push("worst_observed_rpo_missing");
  } else if (worstRpo > 60) {
    blockers.push(`rpo_target_missed:${worstRpo}:target_60`);
  }

  if (worstFailoverRto === null) {
    blockers.push("worst_observed_failover_rto_missing");
  } else if (worstFailoverRto > 15 * 60) {
    blockers.push(
      `failover_rto_target_missed:${worstFailoverRto}:target_900`,
    );
  }

  if (worstFailbackRto === null) {
    blockers.push("worst_observed_failback_rto_missing");
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
    rehearsal_count: records.length,
    worst_observed_rpo_seconds: worstRpo,
    worst_observed_failover_rto_seconds: worstFailoverRto,
    worst_observed_failback_rto_seconds: worstFailbackRto,
  };
}
