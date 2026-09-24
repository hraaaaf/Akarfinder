import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  new URL(
    "../../../docs/ha-dr/HA05_FAILOVER_SIMULATION_CONTRACT_2026-09-24.md",
    import.meta.url,
  ),
  "utf8",
);

test("HA-05 requires isolated rehearsal before production rehearsal", () => {
  assert.match(contract, /HA05-A — isolated rehearsal/);
  assert.match(contract, /HA05-B — production failover rehearsal/);
  assert.match(contract, /HA05-A passes/);
});

test("HA-05 enforces legal single-writer transitions", () => {
  assert.match(contract, /SUPABASE_PRIMARY\s*\n\s*-> FAILOVER_PREP\s*\n\s*-> NEON_PRIMARY/);
  assert.match(contract, /SUPABASE_PRIMARY -> NEON_PRIMARY/);
  assert.match(contract, /is forbidden/);
  assert.match(contract, /verify both application writers are disabled/);
});

test("HA-05 requires fencing before Neon promotion", () => {
  assert.match(contract, /fence application writes to Supabase/);
  assert.match(contract, /do not enable Neon writes yet/);
  assert.match(contract, /Supabase fenced before Neon enablement/);
});

test("HA-05 requires deterministic incident boundary before incident writes", () => {
  assert.match(contract, /establish incident-delta capture boundary/);
  assert.match(contract, /first incident write occurs before a deterministic capture boundary exists, the rehearsal FAILS/);
  assert.match(contract, /incident_start_lsn/);
});

test("HA-05 keeps Vercel behind explicit authorization", () => {
  assert.match(contract, /no provider change may be deployed through Vercel without explicit authorization/);
  assert.match(contract, /environment-variable change alone is still a production switch/);
});

test("HA-05 forbids simple rollback after Neon has accepted incident writes", () => {
  assert.match(contract, /rollback is no longer a simple writer toggle/);
  assert.match(contract, /execute HA-06 reverse-delta\/failback process/);
  assert.match(contract, /never directly re-enable Supabase writer/);
});

test("HA-05 separates functional safety from performance", () => {
  assert.match(contract, /FUNCTIONAL_PASS \/ PERFORMANCE_NOT_CERTIFIED/);
  assert.match(contract, /failover RTO <= 15 minutes/);
  assert.match(contract, /target, not a pass override for integrity failures/);
});
