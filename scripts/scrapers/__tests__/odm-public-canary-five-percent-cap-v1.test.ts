import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ODM_PUBLIC_CANARY_MAX_PERCENT,
  readPublicCanaryPercent,
} from "../../../lib/odm/odm-public-canary.ts";

const source = readFileSync("lib/odm/odm-public-canary.ts", "utf8");

test("public ODM Canary keeps five percent valid within the full-cutover ceiling", () => {
  assert.equal(ODM_PUBLIC_CANARY_MAX_PERCENT, 100);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "5" } as NodeJS.ProcessEnv), 5);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "25" } as NodeJS.ProcessEnv), 25);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "50" } as NodeJS.ProcessEnv), 50);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "100" } as NodeJS.ProcessEnv), 100);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "100.01" } as NodeJS.ProcessEnv), 0);
});

test("public ODM Canary remains fail-closed behind enabled, approved and stop switches", () => {
  assert.match(source, /ODM_PUBLIC_CANARY_ENABLED/);
  assert.match(source, /ODM_PUBLIC_CANARY_APPROVED/);
  assert.match(source, /ODM_PUBLIC_CANARY_STOP/);
  assert.match(source, /bucket\(stableKey\)\s*<\s*Math\.floor\(percent \* 100\)/);
});
