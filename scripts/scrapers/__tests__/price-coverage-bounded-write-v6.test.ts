import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSnapshotRanges } from "../price-coverage-bounded-write-v6";

describe("price coverage bounded write v6", () => {
  it("captures contiguous non-overlapping ranges", () => {
    assert.deepEqual(buildSnapshotRanges(120, 4), [
      { page: 0, from: 0, to: 119 },
      { page: 1, from: 120, to: 239 },
      { page: 2, from: 240, to: 359 },
      { page: 3, from: 360, to: 479 },
    ]);
  });

  it("keeps adjacent snapshot pages non-overlapping", () => {
    const ranges = buildSnapshotRanges(200, 8);
    for (let i = 1; i < ranges.length; i += 1) {
      assert.equal(ranges[i - 1].to + 1, ranges[i].from);
    }
  });
});
