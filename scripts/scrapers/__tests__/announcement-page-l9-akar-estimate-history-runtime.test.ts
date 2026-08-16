import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Listing } from "../../../lib/listings/types";
import { buildAkarEstimateHistoryRuntime } from "../../../lib/property-detail/akar-estimate-history-runtime";

describe("ANN-L9 runtime fail-closed", () => {
  it("returns no history and no estimate while Market Index reads are disabled", async () => {
    const listing = { id: "123" } as Listing;
    const result = await buildAkarEstimateHistoryRuntime(listing, { env: {} });
    assert.equal(result.history.status, "unavailable");
    assert.equal(result.history.observationCount, 0);
    assert.equal(result.estimate, null);
  });

  it("does not fabricate an estimate merely because an observed history could exist", async () => {
    const listing = { id: "owner-123" } as Listing;
    const result = await buildAkarEstimateHistoryRuntime(listing, {
      env: { MARKET_INDEX_READ_ENABLED: "false" },
    });
    assert.equal(result.estimate, null);
  });
});
