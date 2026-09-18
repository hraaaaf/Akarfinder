import test from "node:test";
import assert from "node:assert/strict";

import { assessDenominator } from "../../../data-ingestion/sources/mubawab/denominator-reconciliation";

test("robots-restricted lower bound can never be promoted to an exact denominator", () => {
  const result = assessDenominator({
    public_anchor: {
      value: 102_532,
      evidence: "anchor_only",
      observed_at: "2026-09-04T18:00:00Z",
      note: "public Mubawab presentation anchor",
    },
    buckets: [
      { name: "accessible_units", value: 31_731, evidence: "exact", note: "historical unique-ID seed only for arithmetic test" },
      { name: "project_non_units", value: 225, evidence: "lower_bound", note: "sample project catalogue evidence" },
      { name: "aliases_duplicates", value: 0, evidence: "lower_bound", note: "not reconciled yet" },
      { name: "restricted_component", value: 411, evidence: "lower_bound", note: "seven Oasis leaf lower bound" },
    ],
  });

  assert.equal(result.exact_explained_total, null);
  assert.equal(result.can_certify_denominator, false);
  assert(result.blockers.includes("bucket_restricted_component_not_exact:lower_bound"));
  assert.equal(result.minimum_explained_total, 32_367);
});

test("even exact arithmetic cannot certify against a marketing anchor without independent reconciliation", () => {
  const result = assessDenominator({
    public_anchor: {
      value: 100,
      evidence: "anchor_only",
      observed_at: "2026-09-04T18:00:00Z",
      note: "anchor",
    },
    buckets: [
      { name: "accessible_units", value: 80, evidence: "exact", note: "exact unit union" },
      { name: "project_non_units", value: 10, evidence: "exact", note: "exact projects" },
      { name: "aliases_duplicates", value: 5, evidence: "exact", note: "exact aliases" },
      { name: "restricted_component", value: 5, evidence: "exact", note: "exact restricted" },
    ],
  });

  assert.equal(result.exact_explained_total, 100);
  assert.equal(result.arithmetic_gap_if_exact, 0);
  assert.equal(result.can_certify_denominator, false);
  assert(result.blockers.includes("public_anchor_is_not_unique_id_denominator"));
});
