import assert from "node:assert/strict";
import test from "node:test";

import {
  assertHaWriterTransition,
  assertSingleWriter,
  canTransitionHaWriter,
  getHaWriter,
} from "../../../lib/db/ha-writer-state.js";

test("HA states expose exactly one writer or an intentional write freeze", () => {
  assert.equal(getHaWriter("SUPABASE_PRIMARY"), "supabase");
  assert.equal(getHaWriter("FAILOVER_PREP"), "none");
  assert.equal(getHaWriter("NEON_PRIMARY"), "neon");
  assert.equal(getHaWriter("FAILBACK_SYNC"), "neon");
  assert.equal(getHaWriter("FAILBACK_FREEZE"), "none");
});

test("normal failover path is explicitly allowed", () => {
  assert.equal(canTransitionHaWriter("SUPABASE_PRIMARY", "FAILOVER_PREP"), true);
  assert.equal(canTransitionHaWriter("FAILOVER_PREP", "NEON_PRIMARY"), true);
});

test("normal failback path requires sync then final freeze", () => {
  assert.equal(canTransitionHaWriter("NEON_PRIMARY", "FAILBACK_SYNC"), true);
  assert.equal(canTransitionHaWriter("FAILBACK_SYNC", "FAILBACK_FREEZE"), true);
  assert.equal(canTransitionHaWriter("FAILBACK_FREEZE", "SUPABASE_PRIMARY"), true);
});

test("direct writer swaps are rejected", () => {
  assert.equal(canTransitionHaWriter("SUPABASE_PRIMARY", "NEON_PRIMARY"), false);
  assert.equal(canTransitionHaWriter("NEON_PRIMARY", "SUPABASE_PRIMARY"), false);
  assert.throws(
    () => assertHaWriterTransition("SUPABASE_PRIMARY", "NEON_PRIMARY"),
    /Unsafe HA writer transition/,
  );
});

test("rollback transitions preserve a single-writer path", () => {
  assert.equal(canTransitionHaWriter("FAILOVER_PREP", "SUPABASE_PRIMARY"), true);
  assert.equal(canTransitionHaWriter("FAILBACK_SYNC", "NEON_PRIMARY"), true);
  assert.equal(canTransitionHaWriter("FAILBACK_FREEZE", "NEON_PRIMARY"), true);
});

test("split-brain is always rejected", () => {
  assert.throws(
    () =>
      assertSingleWriter({
        state: "SUPABASE_PRIMARY",
        supabaseWritesEnabled: true,
        neonWritesEnabled: true,
      }),
    /Split-brain guard/,
  );
});

test("writer flags must match the declared HA state", () => {
  assert.doesNotThrow(() =>
    assertSingleWriter({
      state: "SUPABASE_PRIMARY",
      supabaseWritesEnabled: true,
      neonWritesEnabled: false,
    }),
  );

  assert.doesNotThrow(() =>
    assertSingleWriter({
      state: "NEON_PRIMARY",
      supabaseWritesEnabled: false,
      neonWritesEnabled: true,
    }),
  );

  assert.doesNotThrow(() =>
    assertSingleWriter({
      state: "FAILOVER_PREP",
      supabaseWritesEnabled: false,
      neonWritesEnabled: false,
    }),
  );

  assert.throws(
    () =>
      assertSingleWriter({
        state: "FAILBACK_SYNC",
        supabaseWritesEnabled: true,
        neonWritesEnabled: false,
      }),
    /HA writer mismatch/,
  );
});
