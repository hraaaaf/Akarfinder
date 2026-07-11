import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runPricePositionRollbackSmoke } from "../../audits/price-position-rollback-smoke";

describe("price-position rollback smoke", () => {
  it("hides all price-position surfaces when the flag is off", async () => {
    const result = await runPricePositionRollbackSmoke();
    assert.equal(result.flag_off_hidden, true);
    assert.equal(result.flag_on_visible, true);
    assert.equal(result.internal_leak, true);
    assert.equal(result.routes_checked, 0);
    assert.equal(result.route_failures.length, 0);
  });
});
