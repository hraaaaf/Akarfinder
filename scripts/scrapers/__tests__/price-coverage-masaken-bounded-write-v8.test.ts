import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSnapshotRanges, hasExplicitMasakenWriteConfirmation } from "../price-coverage-masaken-bounded-write-v8";

describe("price coverage Masaken bounded write v8", () => {
  it("captures five contiguous non-overlapping pages", () => {
    const ranges = buildSnapshotRanges(120, 5);
    assert.equal(ranges.length, 5);
    assert.deepEqual(ranges[0], { page: 0, from: 0, to: 119 });
    assert.deepEqual(ranges[4], { page: 4, from: 480, to: 599 });
    for (let i = 1; i < ranges.length; i += 1) {
      assert.equal(ranges[i - 1].to + 1, ranges[i].from);
    }
  });

  it("fails closed unless the exact Masaken confirmation phrase is supplied", () => {
    assert.equal(hasExplicitMasakenWriteConfirmation(undefined), false);
    assert.equal(hasExplicitMasakenWriteConfirmation("READ_ONLY"), false);
    assert.equal(hasExplicitMasakenWriteConfirmation("WRITE_100_RELIABLE_PRICES"), false);
    assert.equal(hasExplicitMasakenWriteConfirmation("WRITE_100_MASAKEN_RELIABLE_PRICES "), false);
    assert.equal(hasExplicitMasakenWriteConfirmation("WRITE_100_MASAKEN_RELIABLE_PRICES"), true);
  });
});
