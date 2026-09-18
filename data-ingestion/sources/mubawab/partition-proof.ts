export type PartitionChildEvidence = {
  key: string;
  total_results: number;
  source_ids: string[];
  complete_on_first_page: boolean;
  derived_from_exposed_parent_control: boolean;
};

export type PartitionProofInput = {
  parent_total_results: number;
  basis_exhaustive: boolean;
  children: PartitionChildEvidence[];
};

export type PartitionProofVerdict = {
  pass: boolean;
  reasons: string[];
  child_total_sum: number;
  union_unique_ids: number;
  cross_child_duplicate_ids: string[];
};

export function evaluatePartitionProof(input: PartitionProofInput): PartitionProofVerdict {
  const reasons: string[] = [];

  if (!Number.isInteger(input.parent_total_results) || input.parent_total_results < 0) {
    reasons.push("invalid_parent_total");
  }
  if (input.children.length === 0) reasons.push("no_children");
  if (!input.basis_exhaustive) reasons.push("partition_basis_not_proven_exhaustive");

  const keys = new Set<string>();
  const idOwner = new Map<string, string>();
  const duplicateIds = new Set<string>();
  let childTotalSum = 0;

  for (const child of input.children) {
    if (!child.key || keys.has(child.key)) reasons.push(`duplicate_or_empty_child_key:${child.key}`);
    keys.add(child.key);

    if (!Number.isInteger(child.total_results) || child.total_results < 0) {
      reasons.push(`invalid_child_total:${child.key}`);
      continue;
    }
    childTotalSum += child.total_results;

    if (!child.derived_from_exposed_parent_control) {
      reasons.push(`child_not_derived_from_exposed_parent_control:${child.key}`);
    }
    if (!child.complete_on_first_page) {
      reasons.push(`child_not_complete_on_first_page:${child.key}`);
    }

    const uniqueChildIds = new Set(child.source_ids);
    if (uniqueChildIds.size !== child.source_ids.length) {
      reasons.push(`duplicate_ids_inside_child:${child.key}`);
    }
    if (uniqueChildIds.size !== child.total_results) {
      reasons.push(`child_id_count_mismatch:${child.key}`);
    }

    for (const id of uniqueChildIds) {
      const owner = idOwner.get(id);
      if (owner && owner !== child.key) duplicateIds.add(id);
      else idOwner.set(id, child.key);
    }
  }

  const crossChildDuplicateIds = [...duplicateIds].sort();
  if (crossChildDuplicateIds.length > 0) reasons.push("cross_child_overlap_detected");
  if (childTotalSum !== input.parent_total_results) reasons.push("child_totals_do_not_reconcile_parent_total");
  if (idOwner.size !== input.parent_total_results) reasons.push("child_union_does_not_reconcile_parent_total");

  return {
    pass: reasons.length === 0,
    reasons,
    child_total_sum: childTotalSum,
    union_unique_ids: idOwner.size,
    cross_child_duplicate_ids: crossChildDuplicateIds,
  };
}
