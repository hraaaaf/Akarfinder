import assert from "node:assert/strict";
import test from "node:test";
import { classifyRepresentativeness } from "../../audits/p1c4-acquisition-representativeness";

const certified = {
  independent_denominator_defined: true,
  denominator_scope_exact: true,
  expected_source_universe_versioned: true,
  acquisition_channels_reconciled: true,
  observed_sources_used_as_denominator: false,
  per_source_depth_proven: true,
  per_source_freshness_proven: true,
  denominator_critical_gap_count: 0,
};

test("P1C.4 certifies only an independent exact-scope denominator with complete acquisition proof", () => {
  assert.equal(classifyRepresentativeness(certified), "CERTIFIED");
});

test("P1C.4 refuses a circular denominator built from observed sources", () => {
  assert.equal(
    classifyRepresentativeness({ ...certified, observed_sources_used_as_denominator: true }),
    "NOT_CERTIFIABLE",
  );
});

test("P1C.4 refuses a missing or non-exact denominator", () => {
  assert.equal(
    classifyRepresentativeness({ ...certified, independent_denominator_defined: false }),
    "NOT_CERTIFIABLE",
  );
  assert.equal(
    classifyRepresentativeness({ ...certified, denominator_scope_exact: false }),
    "NOT_CERTIFIABLE",
  );
  assert.equal(
    classifyRepresentativeness({ ...certified, expected_source_universe_versioned: false }),
    "NOT_CERTIFIABLE",
  );
});

test("P1C.4 refuses unreconciled acquisition channels", () => {
  assert.equal(
    classifyRepresentativeness({ ...certified, acquisition_channels_reconciled: false }),
    "NOT_CERTIFIABLE",
  );
});

test("P1C.4 returns INSUFFICIENT only after the independent denominator exists", () => {
  assert.equal(
    classifyRepresentativeness({ ...certified, per_source_depth_proven: false }),
    "INSUFFICIENT",
  );
  assert.equal(
    classifyRepresentativeness({ ...certified, per_source_freshness_proven: false }),
    "INSUFFICIENT",
  );
  assert.equal(
    classifyRepresentativeness({ ...certified, denominator_critical_gap_count: 1 }),
    "INSUFFICIENT",
  );
});
