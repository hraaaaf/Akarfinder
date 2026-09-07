import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyResidualsAgainstKnownUnion,
  summarizeResidualClassification,
} from "../../../data-ingestion/sources/mubawab/residual-classifier";

test("classifies bounded reachability residuals against the certified global union", () => {
  const result = classifyResidualsAgainstKnownUnion(
    [
      { control_id: "ct-sale", control_family: "ct", unexplained_source_ids: ["1", "2", "3"] },
      { control_id: "is-sale", control_family: "is", unexplained_source_ids: ["2", "4"] },
    ],
    ["1", "2", "9"],
  );

  assert.deepEqual(result[0].already_known_in_certified_union, ["1", "2"]);
  assert.deepEqual(result[0].absent_from_certified_union, ["3"]);
  assert.deepEqual(result[1].already_known_in_certified_union, ["2"]);
  assert.deepEqual(result[1].absent_from_certified_union, ["4"]);

  assert.deepEqual(summarizeResidualClassification(result), {
    unique_sampled_residual_ids: 4,
    unique_already_known_in_certified_union: 2,
    unique_absent_from_certified_union: 2,
    absent_source_ids: ["3", "4"],
  });
});
