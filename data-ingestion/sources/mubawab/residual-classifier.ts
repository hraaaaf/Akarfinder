export type ReachabilityVerdictLike = {
  control_id: string;
  control_family: string;
  unexplained_source_ids: string[];
};

export type ResidualClassification = {
  control_id: string;
  control_family: string;
  sampled_residual_ids: number;
  already_known_in_certified_union: string[];
  absent_from_certified_union: string[];
};

export function classifyResidualsAgainstKnownUnion(
  verdicts: ReachabilityVerdictLike[],
  knownSourceIds: Iterable<string>,
): ResidualClassification[] {
  const known = new Set(knownSourceIds);
  return verdicts.map((verdict) => {
    const residuals = [...new Set(verdict.unexplained_source_ids)];
    return {
      control_id: verdict.control_id,
      control_family: verdict.control_family,
      sampled_residual_ids: residuals.length,
      already_known_in_certified_union: residuals.filter((id) => known.has(id)),
      absent_from_certified_union: residuals.filter((id) => !known.has(id)),
    };
  });
}

export function summarizeResidualClassification(items: ResidualClassification[]) {
  const sampled = new Set<string>();
  const known = new Set<string>();
  const absent = new Set<string>();

  for (const item of items) {
    for (const id of item.already_known_in_certified_union) {
      sampled.add(id);
      known.add(id);
    }
    for (const id of item.absent_from_certified_union) {
      sampled.add(id);
      absent.add(id);
    }
  }

  return {
    unique_sampled_residual_ids: sampled.size,
    unique_already_known_in_certified_union: known.size,
    unique_absent_from_certified_union: absent.size,
    absent_source_ids: [...absent],
  };
}
