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


test("HA runbook freezes SQL probes during planned restore", () => {
  assert.match(runbook, /do not probe the database while the operator has declared it paused/);
  assert.match(runbook, /resume SQL checks only after an explicit human signal that the restore is complete/);
  assert.match(runbook, /R0 — minimal health/);
  assert.match(runbook, /do not retry-loop/);
});

test("HA runbook uses a read-only gated post-restore sequence", () => {
  assert.match(runbook, /R1 — recovery-state sanity/);
  assert.match(runbook, /pg_is_in_recovery\(\)/);
  assert.match(runbook, /transaction_read_only/);
  assert.match(runbook, /R2 — read-only HA capability inventory/);
  assert.match(runbook, /R3 — restore drift assessment/);
  assert.match(runbook, /R4 — source portability suite/);
  assert.match(runbook, /require 5\/5 green/);
  assert.match(runbook, /R5 — target\/baseline decision/);
  assert.match(runbook, /ambiguous restore\/delta boundary defaults to rebaseline/);
});

test("restore recovery mode authorizes no production mutation by itself", () => {
  assert.match(
    runbook,
    /No production write, canary schema application, publication\/subscription mutation, provider switch or Vercel change is authorized by recovery-mode completion alone/,
  );
});
