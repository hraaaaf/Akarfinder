import test from "node:test";
import assert from "node:assert/strict";

import { nextAmbiguityResolutionStep } from "../../../data-ingestion/sources/mubawab/ambiguity-resolution";

test("clear card evidence is classified without detail lookup", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: true, detailRobotsAllowed: true }), "classify_from_card");
});

test("ambiguous card must inspect a robots-allowed public detail before human escalation", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: true }), "inspect_allowed_detail");
});

test("clear detail evidence closes the ambiguity without human review", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: true, detailClear: true }), "classify_from_card");
});

test("human review happens only after allowed detail remains ambiguous or detail is unavailable", () => {
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: true, detailClear: false }), "human_review");
  assert.equal(nextAmbiguityResolutionStep({ cardClear: false, detailRobotsAllowed: false }), "human_review");
});
