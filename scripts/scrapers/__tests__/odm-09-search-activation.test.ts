import assert from "node:assert/strict";
import test from "node:test";

function gatewayEnabled(raw: string | undefined): boolean {
  return raw !== "false";
}

test("ODM-09 enables the certified Search Gateway by default", () => {
  assert.equal(gatewayEnabled(undefined), true);
  assert.equal(gatewayEnabled("true"), true);
  assert.equal(gatewayEnabled("false"), false);
});
