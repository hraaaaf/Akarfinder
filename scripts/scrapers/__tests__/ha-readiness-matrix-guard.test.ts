import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const matrix = readFileSync(
  new URL(
    "../../../docs/ha-dr/SUPABASE_NEON_HA_DR_READINESS_MATRIX_2026-09-24.md",
    import.meta.url,
  ),
  "utf8",
);

test("HA readiness matrix covers HA-01 through HA-07", () => {
  for (const lot of ["HA-01", "HA-02", "HA-03", "HA-04", "HA-05", "HA-06", "HA-07"]) {
    assert.match(matrix, new RegExp(`## ${lot} —`));
  }
});

test("HA readiness matrix distinguishes prepared from certified", () => {
  assert.match(matrix, /PREPARED \/ NOT CERTIFIED/);
  assert.match(matrix, /A prepared artifact must never be presented as a live HA capability/);
});

test("HA readiness matrix preserves the live-gate order", () => {
  const l1 = matrix.indexOf("Gate L1");
  const l2 = matrix.indexOf("Gate L2");
  const l3 = matrix.indexOf("Gate L3");
  const l4 = matrix.indexOf("Gate L4");
  const l5 = matrix.indexOf("Gate L5");
  assert.ok(l1 >= 0 && l1 < l2 && l2 < l3 && l3 < l4 && l4 < l5);
});

test("HA readiness matrix blocks mutation rehearsal until baseline parity", () => {
  assert.match(matrix, /Only after L5 may HA-04 mutation rehearsal be considered/);
});

test("HA readiness matrix claims no production mutation from the HA branch", () => {
  assert.match(matrix, /no Vercel deploy/);
  assert.match(matrix, /no provider switch/);
  assert.match(matrix, /no Supabase write/);
  assert.match(matrix, /no Neon write/);
  assert.match(matrix, /canary migration not applied/);
});
