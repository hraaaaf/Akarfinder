import assert from "node:assert/strict";
import test from "node:test";

import {
  assertHaApplicationWriteTarget,
  assertHaNeonWriteAllowed,
  assertHaReadProviderCoherent,
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


test("legacy mode leaves read-provider migration choices untouched", () => {
  for (const provider of ["sqlite", "supabase", "neon"] as const) {
    assert.doesNotThrow(() => assertHaReadProviderCoherent(provider, {}));
  }
});

test("explicit HA state enforces coherent read provider", () => {
  assert.doesNotThrow(() =>
    assertHaReadProviderCoherent("supabase", {
      HA_WRITER_STATE: "SUPABASE_PRIMARY",
    }),
  );
  assert.throws(
    () =>
      assertHaReadProviderCoherent("neon", {
        HA_WRITER_STATE: "SUPABASE_PRIMARY",
      }),
    /HA read provider mismatch/,
  );

  for (const state of ["NEON_PRIMARY", "FAILBACK_SYNC", "FAILBACK_FREEZE"] as const) {
    assert.doesNotThrow(() =>
      assertHaReadProviderCoherent("neon", { HA_WRITER_STATE: state }),
    );
    assert.throws(
      () =>
        assertHaReadProviderCoherent("supabase", {
          HA_WRITER_STATE: state,
        }),
      /HA read provider mismatch/,
    );
  }
});

test("FAILOVER_PREP allows read-path establishment while writes remain fenced", () => {
  for (const provider of ["supabase", "neon"] as const) {
    assert.doesNotThrow(() =>
      assertHaReadProviderCoherent(provider, {
        HA_WRITER_STATE: "FAILOVER_PREP",
      }),
    );
  }
});
