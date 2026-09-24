import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runbook = readFileSync(
  new URL("../../../docs/ha-dr/SUPABASE_NEON_HA_DR_OPERATOR_RUNBOOK_2026-09-24.md", import.meta.url),
  "utf8",
);

test("HA runbook preserves single-writer doctrine", () => {
  assert.match(runbook, /Exactly one application writer at a time/);
  assert.match(runbook, /SUPABASE_PRIMARY → Supabase/);
  assert.match(runbook, /NEON_PRIMARY → Neon/);
  assert.match(runbook, /FAILOVER_PREP → none/);
  assert.match(runbook, /FAILBACK_FREEZE → none/);
});

test("HA runbook forbids direct writer swaps", () => {
  assert.match(runbook, /Direct SUPABASE_PRIMARY → NEON_PRIMARY is forbidden/);
  assert.match(runbook, /Direct NEON_PRIMARY → SUPABASE_PRIMARY is forbidden/);
});

test("HA runbook requires reverse sync and final parity before failback", () => {
  assert.match(runbook, /Enter FAILBACK_SYNC/);
  assert.match(runbook, /Enter FAILBACK_FREEZE/);
  assert.match(runbook, /final parity suite/i);
  assert.match(runbook, /STOP if any parity gate fails/);
});

test("HA runbook has explicit rollback paths", () => {
  assert.match(runbook, /FAILOVER_PREP → SUPABASE_PRIMARY/);
  assert.match(runbook, /FAILBACK_SYNC → NEON_PRIMARY/);
  assert.match(runbook, /FAILBACK_FREEZE → NEON_PRIMARY/);
});

test("HA runbook keeps production deployment behind explicit authorization", () => {
  assert.match(runbook, /No Vercel production deployment without explicit authorization/);
});

test("HA runbook fails safe on unproven replication-origin behavior", () => {
  assert.match(runbook, /origin = none/);
  assert.match(runbook, /rebaseline/i);
  assert.match(runbook, /if origin behavior is uncertain/i);
});
