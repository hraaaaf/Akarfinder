import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/odm/odm-public-canary.ts", "utf8");

test("public ODM Canary safety cap permits the approved 5 percent ramp", () => {
  assert.match(source, /ODM_PUBLIC_CANARY_MAX_PERCENT\s*=\s*5\s*;/);
});

test("public ODM Canary remains fail-closed behind enabled, approved and stop switches", () => {
  assert.match(source, /ODM_PUBLIC_CANARY_ENABLED/);
  assert.match(source, /ODM_PUBLIC_CANARY_APPROVED/);
  assert.match(source, /ODM_PUBLIC_CANARY_STOP/);
  assert.match(source, /bucket\(stableKey\)\s*<\s*Math\.floor\(percent \* 100\)/);
});
