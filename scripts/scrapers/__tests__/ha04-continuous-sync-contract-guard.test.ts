import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  new URL(
    "../../../docs/ha-dr/HA04_CONTINUOUS_SYNC_REHEARSAL_CONTRACT_2026-09-24.md",
    import.meta.url,
  ),
  "utf8",
);

test("HA-04 rehearsal uses canary only and forbids business mutations", () => {
  assert.match(contract, /akarfinder_ha_replication_canary/);
  assert.match(contract, /No listing, lead, seller, search or map business row may be modified/);
  assert.match(contract, /no business table mutation/i);
});

test("HA-04 covers insert update delete and measured lag", () => {
  assert.match(contract, /HA04-T01 — INSERT/);
  assert.match(contract, /HA04-T02 — UPDATE/);
  assert.match(contract, /HA04-T03 — DELETE/);
  assert.match(contract, /visibility_lag/);
  assert.match(contract, /forward_start_lsn/);
  assert.match(contract, /forward_end_lsn/);
});

test("HA-04 does not confuse canary transport with business publication proof", () => {
  assert.match(contract, /does not prove that all business tables/);
  assert.match(contract, /publication membership for every approved HA business table/);
});

test("HA-04 keeps functional and performance certification separate", () => {
  assert.match(contract, /FUNCTIONAL_PASS \/ PERFORMANCE_NOT_CERTIFIED/);
  assert.match(contract, /worst observed mutation visibility lag <= 60 seconds/);
  assert.match(contract, /Do not rewrite this as full HA PASS/);
});

test("HA-04 requires explicit production mutation approval", () => {
  assert.match(contract, /explicit production DB mutation approval/);
  assert.match(contract, /does \*\*not\*\* authorize INSERT\/UPDATE\/DELETE/);
  assert.match(contract, /applying the canary schema to production Supabase\/Neon/);
});

test("HA-04 cleanup and split-brain failures are explicit", () => {
  assert.match(contract, /Cleanup failure = `FAIL`/);
  assert.match(contract, /split-brain evidence/);
  assert.match(contract, /cleanup leaves rehearsal rows/);
  assert.match(contract, /conflicts > 0/);
});
