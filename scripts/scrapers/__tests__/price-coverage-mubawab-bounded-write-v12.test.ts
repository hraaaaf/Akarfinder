import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSnapshotRanges, hasExplicitMubawabWriteConfirmation } from "../price-coverage-mubawab-bounded-write-v12";

describe("price coverage Mubawab bounded write v12", () => {
  it("captures five contiguous non-overlapping pages", () => {
    const ranges = buildSnapshotRanges(120, 5);
    assert.equal(ranges.length, 5);
    assert.deepEqual(ranges[0], { page: 0, from: 0, to: 119 });
    assert.deepEqual(ranges[4], { page: 4, from: 480, to: 599 });
    for (let i = 1; i < ranges.length; i += 1) {
      assert.equal(ranges[i - 1].to + 1, ranges[i].from);
    }
  });

  it("fails closed unless the exact Mubawab confirmation phrase is supplied", () => {
    assert.equal(hasExplicitMubawabWriteConfirmation(undefined), false);
    assert.equal(hasExplicitMubawabWriteConfirmation("READ_ONLY"), false);
    assert.equal(hasExplicitMubawabWriteConfirmation("WRITE_100_RELIABLE_PRICES"), false);
    assert.equal(hasExplicitMubawabWriteConfirmation("WRITE_100_MUBAWAB_RELIABLE_PRICES "), false);
    assert.equal(hasExplicitMubawabWriteConfirmation("write_100_mubawab_reliable_prices"), false);
    assert.equal(hasExplicitMubawabWriteConfirmation("WRITE_100_MUBAWAB_RELIABLE_PRICES"), true);
  });
});
