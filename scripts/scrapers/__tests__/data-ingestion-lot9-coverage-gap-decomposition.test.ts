import test from "node:test";
import assert from "node:assert/strict";

import { decomposeCoverageGap } from "../../../data-ingestion/sources/mubawab/coverage-gap-decomposition";

test("measures visible external recall without crediting unattributed hidden ids", () => {
  const result = decomposeCoverageGap({
    leaves: [
      {
        url: "https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-louer",
        total_results: 100,
        first_page_unit_ids: ["1", "2", "3"],
        status: "overflow_requires_disallowed_pagination",
        unexplained_lower_bound: 97,
      },
      {
        url: "https://www.mubawab.ma/fr/sd/casablanca/oasis/locaux-a-louer",
        total_results: 2,
        first_page_unit_ids: ["4", "5"],
        status: "complete_on_first_page",
        unexplained_lower_bound: 0,
      },
    ],
    external_union_ids: ["1", "4", "999"],
    newest_snapshot_ids: ["1", "999"],
    recent_external_candidates: 42,
  });

  assert.equal(result.summary.visible_control_unique_ids, 5);
  assert.equal(result.summary.matched_visible_by_external_union, 2);
  assert.equal(result.summary.matched_visible_by_newest_snapshot, 1);
  assert.equal(result.summary.structural_hidden_lower_bound, 97);
  assert.equal(result.summary.certifiably_explained_hidden_ids, 0);
  assert.equal(result.summary.remaining_structural_hidden_lower_bound, 97);
  assert.equal(result.summary.can_attribute_external_candidates_to_hidden_leaves, false);
  assert.equal(result.summary.can_certify_gap_closed, false);
  assert.equal(result.leaves[0].matched_by_external_union, 1);
  assert.equal(result.leaves[0].remaining_hidden_lower_bound, 97);
});

test("deduplicates visible ids before calculating recall", () => {
  const result = decomposeCoverageGap({
    leaves: [{
      url: "leaf",
      total_results: 2,
      first_page_unit_ids: ["1", "1", "2"],
      status: "complete_on_first_page",
      unexplained_lower_bound: 0,
    }],
    external_union_ids: ["1"],
    newest_snapshot_ids: [],
    recent_external_candidates: 0,
  });

  assert.equal(result.leaves[0].visible_unique_ids, 2);
  assert.equal(result.leaves[0].external_union_visible_recall_ratio, 0.5);
});
