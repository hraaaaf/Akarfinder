export type EvidenceStrength = "exact" | "lower_bound" | "anchor_only";

export type DenominatorBucket = {
  name: "accessible_units" | "project_non_units" | "aliases_duplicates" | "restricted_component";
  value: number;
  evidence: EvidenceStrength;
  note: string;
};

export type PublicCatalogAnchor = {
  value: number;
  evidence: "anchor_only";
  observed_at: string;
  note: string;
};

export type DenominatorReconciliation = {
  buckets: DenominatorBucket[];
  public_anchor: PublicCatalogAnchor;
};

export type DenominatorAssessment = {
  exact_explained_total: number | null;
  minimum_explained_total: number;
  public_anchor: number;
  arithmetic_gap_if_exact: number | null;
  can_certify_denominator: boolean;
  blockers: string[];
};

function bucket(input: DenominatorReconciliation, name: DenominatorBucket["name"]): DenominatorBucket | undefined {
  return input.buckets.find((item) => item.name === name);
}

export function assessDenominator(input: DenominatorReconciliation): DenominatorAssessment {
  const blockers: string[] = [];
  const required: DenominatorBucket["name"][] = [
    "accessible_units",
    "project_non_units",
    "aliases_duplicates",
    "restricted_component",
  ];

  for (const name of required) {
    const matches = input.buckets.filter((item) => item.name === name);
    if (matches.length !== 1) blockers.push(`bucket_${name}_must_exist_exactly_once`);
  }

  for (const item of input.buckets) {
    if (!Number.isInteger(item.value) || item.value < 0) blockers.push(`bucket_${item.name}_invalid_value`);
    if (!item.note.trim()) blockers.push(`bucket_${item.name}_missing_note`);
  }

  if (!Number.isInteger(input.public_anchor.value) || input.public_anchor.value < 0) {
    blockers.push("public_anchor_invalid_value");
  }

  const uniqueBuckets = required.map((name) => bucket(input, name)).filter(Boolean) as DenominatorBucket[];
  const minimumExplained = uniqueBuckets.reduce((sum, item) => sum + item.value, 0);
  const allExact = uniqueBuckets.length === required.length && uniqueBuckets.every((item) => item.evidence === "exact");

  if (!allExact) {
    for (const item of uniqueBuckets) {
      if (item.evidence !== "exact") blockers.push(`bucket_${item.name}_not_exact:${item.evidence}`);
    }
  }

  // A marketing/search counter is a reconciliation anchor, never proof by itself.
  blockers.push("public_anchor_is_not_unique_id_denominator");

  const exactExplainedTotal = allExact ? minimumExplained : null;
  const arithmeticGap = exactExplainedTotal == null ? null : input.public_anchor.value - exactExplainedTotal;

  // Certification requires exact buckets plus an independent explanation of the
  // anchor gap/overlap. This function intentionally cannot PASS from arithmetic alone.
  return {
    exact_explained_total: exactExplainedTotal,
    minimum_explained_total: minimumExplained,
    public_anchor: input.public_anchor.value,
    arithmetic_gap_if_exact: arithmeticGap,
    can_certify_denominator: false,
    blockers: [...new Set(blockers)],
  };
}
