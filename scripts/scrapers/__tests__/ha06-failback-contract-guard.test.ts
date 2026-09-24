import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  new URL(
    "../../../docs/ha-dr/HA06_REVERSE_DELTA_FAILBACK_CONTRACT_2026-09-24.md",
    import.meta.url,
  ),
  "utf8",
);

test("HA-06 enforces the legal failback state path", () => {
  assert.match(contract, /NEON_PRIMARY\s*\n\s*-> FAILBACK_SYNC\s*\n\s*-> FAILBACK_FREEZE\s*\n\s*-> SUPABASE_PRIMARY/);
  assert.match(contract, /NEON_PRIMARY -> SUPABASE_PRIMARY/);
  assert.match(contract, /is forbidden/);
});

test("HA-06 keeps Neon as the sole writer during reverse sync", () => {
  assert.match(contract, /keep Neon application writes enabled/);
  assert.match(contract, /keep Supabase application writes disabled/);
  assert.match(contract, /Single-writer proof must remain Neon-only/);
});

test("HA-06 treats origin filtering and copy_data false as conditional", () => {
  assert.match(contract, /copy_data = false/);
  assert.match(contract, /only when Supabase already contains the proven baseline/);
  assert.match(contract, /origin = none/);
  assert.match(contract, /only when exact behavior is proven/);
});

test("HA-06 requires anti-loop and idempotency proof", () => {
  assert.match(contract, /anti-loop proof/i);
  assert.match(contract, /Supabase-origin replay count = 0/);
  assert.match(contract, /Neon-local incident apply count = 1/);
  assert.match(contract, /interrupted reverse-sync idempotency/i);
});

test("HA-06 requires sequence safety before Supabase promotion", () => {
  assert.match(contract, /sequence \/ identity reconciliation/i);
  assert.match(contract, /next generated Supabase value cannot collide/);
  assert.match(contract, /Sequence risk = BLOCKED or FAIL/);
});

test("HA-06 requires final write freeze and final parity", () => {
  assert.match(contract, /enter FAILBACK_FREEZE/i);
  assert.match(contract, /verify both application writers are disabled/);
  assert.match(contract, /final parity/i);
  assert.match(contract, /Supabase enabled only after all gates pass/);
});

test("HA-06 has a safe rebaseline fallback when origin semantics are uncertain", () => {
  assert.match(contract, /Strategy B — rebaseline fallback/);
  assert.match(contract, /Default fail-safe when origin semantics are uncertain/);
  assert.match(contract, /rebuild\/rebaseline Neon from authoritative Supabase/);
});

test("HA-06 authorizes no live replication mutation", () => {
  assert.match(contract, /NO LIVE REPLICATION CHANGE AUTHORIZED/);
  assert.match(contract, /this document authorizes no live replication mutation/);
});
