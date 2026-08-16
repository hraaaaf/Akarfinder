import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSnapshotRangesV10, hasExplicitMasakenV10WriteConfirmation } from "../price-coverage-masaken-bounded-write-v10";

describe("price coverage Masaken bounded write v10", () => {
  it("captures four contiguous non-overlapping pages covering the v9 cohort", () => {
    const ranges = buildSnapshotRangesV10(120, 4);
    assert.equal(ranges.length, 4);
    assert.deepEqual(ranges[0], { page: 0, from: 0, to: 119 });
    assert.deepEqual(ranges[3], { page: 3, from: 360, to: 479 });
    for (let i = 1; i < ranges.length; i += 1) {
      assert.equal(ranges[i - 1].to + 1, ranges[i].from);
    }
  });

  it("fails closed unless the exact v10 confirmation phrase is supplied", () => {
    assert.equal(hasExplicitMasakenV10WriteConfirmation(undefined), false);
    assert.equal(hasExplicitMasakenV10WriteConfirmation("READ_ONLY"), false);
    assert.equal(hasExplicitMasakenV10WriteConfirmation("WRITE_100_MASAKEN_RELIABLE_PRICES"), false);
    assert.equal(hasExplicitMasakenV10WriteConfirmation("WRITE_100_MASAKEN_RELIABLE_PRICES_V10 "), false);
    assert.equal(hasExplicitMasakenV10WriteConfirmation("WRITE_100_MASAKEN_RELIABLE_PRICES_V10"), true);
  });
});
