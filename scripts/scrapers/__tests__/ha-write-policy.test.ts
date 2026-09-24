import assert from "node:assert/strict";
import test from "node:test";

import {
  assertHaApplicationWriteTarget,
  assertHaNeonWriteAllowed,
  assertHaSupabaseWriteAllowed,
  getHaWriterState,
} from "../../../lib/db/ha-write-policy.js";

test("HA write policy defaults to Supabase primary before explicit activation", () => {
  assert.equal(getHaWriterState({}), "SUPABASE_PRIMARY");
  assert.doesNotThrow(() => assertHaSupabaseWriteAllowed({}));
  assert.throws(
    () => assertHaNeonWriteAllowed({}),
    /HA write target mismatch/,
  );
});

test("invalid explicit HA writer state fails closed", () => {
  assert.throws(
    () => getHaWriterState({ HA_WRITER_STATE: "BROKEN" }),
    /Invalid HA_WRITER_STATE/,
  );
});

test("failover prep and failback freeze fence all application writes", () => {
  for (const state of ["FAILOVER_PREP", "FAILBACK_FREEZE"] as const) {
    assert.throws(
      () => assertHaApplicationWriteTarget("supabase", { HA_WRITER_STATE: state }),
      /HA writes fenced/,
    );
    assert.throws(
      () => assertHaApplicationWriteTarget("neon", { HA_WRITER_STATE: state }),
      /HA writes fenced/,
    );
  }
});

test("Neon primary states reject Supabase writes", () => {
  for (const state of ["NEON_PRIMARY", "FAILBACK_SYNC"] as const) {
    assert.doesNotThrow(() =>
      assertHaApplicationWriteTarget("neon", { HA_WRITER_STATE: state }),
    );
    assert.throws(
      () => assertHaApplicationWriteTarget("supabase", {
        HA_WRITER_STATE: state,
      }),
      /HA write target mismatch/,
    );
  }
});

test("Supabase primary rejects Neon writes", () => {
  assert.doesNotThrow(() =>
    assertHaApplicationWriteTarget("supabase", {
      HA_WRITER_STATE: "SUPABASE_PRIMARY",
    }),
  );
  assert.throws(
    () =>
      assertHaApplicationWriteTarget("neon", {
        HA_WRITER_STATE: "SUPABASE_PRIMARY",
      }),
    /HA write target mismatch/,
  );
});
