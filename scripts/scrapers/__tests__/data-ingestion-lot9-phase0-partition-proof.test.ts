import test from "node:test";
import assert from "node:assert/strict";

import { evaluatePartitionProof } from "../../../data-ingestion/sources/mubawab/partition-proof";

test("passes only an exhaustive, disjoint, fully visible partition that reconciles the parent", () => {
  const result = evaluatePartitionProof({
    parent_total_results: 4,
    basis_exhaustive: true,
    children: [
      {
        key: "bucket-a",
        total_results: 2,
        source_ids: ["1", "2"],
        complete_on_first_page: true,
        derived_from_exposed_parent_control: true,
      },
      {
        key: "bucket-b",
        total_results: 2,
        source_ids: ["3", "4"],
        complete_on_first_page: true,
        derived_from_exposed_parent_control: true,
      },
    ],
  });
  assert.equal(result.pass, true);
  assert.equal(result.union_unique_ids, 4);
});

test("rejects attractive-looking filters that are not exhaustive or overlap", () => {
  const result = evaluatePartitionProof({
    parent_total_results: 4,
    basis_exhaustive: false,
    children: [
      {
        key: "cheap",
        total_results: 2,
        source_ids: ["1", "2"],
        complete_on_first_page: true,
        derived_from_exposed_parent_control: true,
      },
      {
        key: "one-bathroom",
        total_results: 2,
        source_ids: ["2", "3"],
        complete_on_first_page: true,
        derived_from_exposed_parent_control: true,
      },
    ],
  });
  assert.equal(result.pass, false);
  assert(result.reasons.includes("partition_basis_not_proven_exhaustive"));
  assert(result.reasons.includes("cross_child_overlap_detected"));
  assert(result.reasons.includes("child_union_does_not_reconcile_parent_total"));
});

test("rejects any child that still requires pagination", () => {
  const result = evaluatePartitionProof({
    parent_total_results: 40,
    basis_exhaustive: true,
    children: [
      {
        key: "all",
        total_results: 40,
        source_ids: Array.from({ length: 32 }, (_, index) => String(index + 1)),
        complete_on_first_page: false,
        derived_from_exposed_parent_control: true,
      },
    ],
  });
  assert.equal(result.pass, false);
  assert(result.reasons.includes("child_not_complete_on_first_page:all"));
  assert(result.reasons.includes("child_id_count_mismatch:all"));
});
