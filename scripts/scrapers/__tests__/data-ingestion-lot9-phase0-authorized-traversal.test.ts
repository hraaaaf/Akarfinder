import test from "node:test";
import assert from "node:assert/strict";

import {
  assessAuthorizedLeaf,
  summarizeAuthorizedLeaves,
} from "../../../data-ingestion/sources/mubawab/authorized-traversal";

test("leaf is complete only when visible unique unit ids cover the public total", () => {
  const result = assessAuthorizedLeaf({
    url: "https://www.mubawab.ma/fr/sd/casablanca/oasis/bureaux-et-commerces-a-vendre",
    family: "sd",
    total_results: 17,
    first_page_unit_ids: Array.from({ length: 17 }, (_, i) => String(1000 + i)),
    robots_allowed: true,
  });
  assert.equal(result.status, "complete_on_first_page");
  assert.equal(result.unexplained_lower_bound, 0);
});

test("overflow leaf quantifies a strict lower bound instead of pretending page 1 is exhaustive", () => {
  const result = assessAuthorizedLeaf({
    url: "https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-louer",
    family: "sd",
    total_results: 276,
    first_page_unit_ids: Array.from({ length: 32 }, (_, i) => String(2000 + i)),
    robots_allowed: true,
  });
  assert.equal(result.status, "overflow_requires_disallowed_pagination");
  assert.equal(result.unexplained_lower_bound, 244);
});

test("unknown total or robots-disallowed leaf can never be certified complete", () => {
  assert.equal(assessAuthorizedLeaf({
    url: "https://www.mubawab.ma/fr/sd/x",
    family: "sd",
    total_results: null,
    first_page_unit_ids: ["1"],
    robots_allowed: true,
  }).status, "unproven");

  assert.equal(assessAuthorizedLeaf({
    url: "https://www.mubawab.ma/fr/sd/x:p:2",
    family: "sd",
    total_results: 10,
    first_page_unit_ids: [],
    robots_allowed: false,
  }).status, "unproven");
});

test("one overflowing exhaustive leaf blocks certification of the current first-party leaf model", () => {
  const items = [
    assessAuthorizedLeaf({ url: "a", family: "sd", total_results: 2, first_page_unit_ids: ["1", "2"], robots_allowed: true }),
    assessAuthorizedLeaf({ url: "b", family: "sd", total_results: 10, first_page_unit_ids: ["3", "4", "5"], robots_allowed: true }),
  ];
  const summary = summarizeAuthorizedLeaves(items);
  assert.equal(summary.complete_on_first_page, 1);
  assert.equal(summary.overflow, 1);
  assert.equal(summary.unexplained_lower_bound, 7);
  assert.equal(summary.observed_unit_ids, 5);
  assert.equal(summary.blocked_by_overflow, true);
  assert.equal(summary.can_certify_current_leaf_model, false);
});
