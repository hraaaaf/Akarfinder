export type CoverageGapLeaf = {
  url: string;
  total_results: number | null;
  first_page_unit_ids: string[];
  status: string;
  unexplained_lower_bound: number | null;
};

export type CoverageGapLeafResult = {
  url: string;
  status: string;
  total_results: number | null;
  visible_unique_ids: number;
  matched_by_external_union: number;
  matched_by_newest_snapshot: number;
  visible_unmatched_by_external_union: number;
  external_union_visible_recall_ratio: number;
  newest_snapshot_visible_recall_ratio: number;
  hidden_lower_bound: number | null;
  certifiably_explained_hidden_ids: 0;
  remaining_hidden_lower_bound: number | null;
};

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6));
}

export function decomposeCoverageGap(input: {
  leaves: CoverageGapLeaf[];
  external_union_ids: Iterable<string>;
  newest_snapshot_ids: Iterable<string>;
  recent_external_candidates: number;
}) {
  const external = new Set(input.external_union_ids);
  const newest = new Set(input.newest_snapshot_ids);

  const leaves: CoverageGapLeafResult[] = input.leaves.map((leaf) => {
    const visible = [...new Set(leaf.first_page_unit_ids)];
    const matchedExternal = visible.filter((id) => external.has(id)).length;
    const matchedNewest = visible.filter((id) => newest.has(id)).length;
    const hiddenLowerBound = leaf.unexplained_lower_bound;

    return {
      url: leaf.url,
      status: leaf.status,
      total_results: leaf.total_results,
      visible_unique_ids: visible.length,
      matched_by_external_union: matchedExternal,
      matched_by_newest_snapshot: matchedNewest,
      visible_unmatched_by_external_union: visible.length - matchedExternal,
      external_union_visible_recall_ratio: ratio(matchedExternal, visible.length),
      newest_snapshot_visible_recall_ratio: ratio(matchedNewest, visible.length),
      hidden_lower_bound: hiddenLowerBound,
      certifiably_explained_hidden_ids: 0 as const,
      remaining_hidden_lower_bound: hiddenLowerBound,
    };
  });

  const visibleIds = new Set(input.leaves.flatMap((leaf) => leaf.first_page_unit_ids));
  const matchedVisible = [...visibleIds].filter((id) => external.has(id)).length;
  const matchedVisibleNewest = [...visibleIds].filter((id) => newest.has(id)).length;
  const structuralHiddenLowerBound = input.leaves.reduce(
    (sum, leaf) => sum + (leaf.unexplained_lower_bound ?? 0),
    0,
  );

  return {
    leaves,
    summary: {
      visible_control_unique_ids: visibleIds.size,
      matched_visible_by_external_union: matchedVisible,
      matched_visible_by_newest_snapshot: matchedVisibleNewest,
      visible_external_union_recall_ratio: ratio(matchedVisible, visibleIds.size),
      visible_newest_snapshot_recall_ratio: ratio(matchedVisibleNewest, visibleIds.size),
      recent_external_candidates: input.recent_external_candidates,
      structural_hidden_lower_bound: structuralHiddenLowerBound,
      certifiably_explained_hidden_ids: 0,
      remaining_structural_hidden_lower_bound: structuralHiddenLowerBound,
      can_attribute_external_candidates_to_hidden_leaves: false,
      can_certify_gap_closed: false,
    },
    interpretation:
      "External detail-index IDs do not carry independently proven leaf membership. They may enrich the catalog, but none can be credited against a specific hidden leaf residual without separate geography/type attribution evidence.",
  };
}
