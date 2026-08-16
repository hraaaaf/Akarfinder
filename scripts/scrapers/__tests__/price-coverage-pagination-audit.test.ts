import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPageRanges, MAX_PRICE_PAGINATION_PAGES } from "../price-coverage-pagination-audit";

describe("price coverage pagination", () => {
  it("builds non-overlapping contiguous ranges", () => {
    assert.deepEqual(buildPageRanges(120, 4), [
      { page: 0, from: 0, to: 119 },
      { page: 1, from: 120, to: 239 },
      { page: 2, from: 240, to: 359 },
      { page: 3, from: 360, to: 479 },
    ]);
  });

  it("does not overlap adjacent pages through the v9 depth", () => {
    const ranges = buildPageRanges(120, MAX_PRICE_PAGINATION_PAGES);
    assert.equal(ranges.length, 10);
    assert.deepEqual(ranges.at(-1), { page: 9, from: 1080, to: 1199 });
    for (let i = 1; i < ranges.length; i += 1) {
      assert.equal(ranges[i - 1].to + 1, ranges[i].from);
    }
  });
});
