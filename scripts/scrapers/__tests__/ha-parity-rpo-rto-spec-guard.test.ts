import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const spec = readFileSync(
  new URL("../../../docs/ha-dr/SUPABASE_NEON_HA_DR_PARITY_RPO_RTO_SPEC_2026-09-24.md", import.meta.url),
  "utf8",
);

test("HA parity spec requires more than row counts", () => {
  assert.match(spec, /Primary-key set/);
  assert.match(spec, /Deterministic row-content digest/);
  assert.match(spec, /Delete parity/);
  assert.match(spec, /Sequence \/ identity parity/);
  assert.match(spec, /Schema fingerprint/);
  assert.match(spec, /replica identity/i);
});

test("HA reverse-delta spec requires deterministic boundary and anti-loop proof", () => {
  assert.match(spec, /Incident delta capture/);
  assert.match(spec, /starting LSN/);
  assert.match(spec, /Anti-loop proof/);
  assert.match(spec, /origin = none/);
  assert.match(spec, /rebuild\/rebaseline Neon/);
});

test("HA failback requires final freeze and full parity", () => {
  assert.match(spec, /Final failback freeze/);
  assert.match(spec, /stop Neon application writes/);
  assert.match(spec, /drain final reverse delta/);
  assert.match(spec, /execute final parity bundle/);
});

test("HA RPO and RTO remain measured targets rather than assumed certification", () => {
  assert.match(spec, /RPO <= 60 seconds/);
  assert.match(spec, /RTO_failover <= 15 minutes/);
  assert.match(spec, /design target, not a certified value/i);
  assert.match(spec, /worst observed successful values/i);
});

test("HA certification requires repeated rehearsals and interruption scenarios", () => {
  assert.match(spec, /minimum 3 complete failover\/failback rehearsals/);
  assert.match(spec, /interrupted forward replication/);
  assert.match(spec, /interrupted reverse replication/);
  assert.match(spec, /prolonged outage scenario/);
});

test("HA spec treats conflicts and split-brain as hard failures", () => {
  assert.match(spec, /same-record dual modification is a \*\*failure condition\*\*/);
  assert.match(spec, /dual-writer reachability/);
  assert.match(spec, /conflicts = 0/);
  assert.match(spec, /duplicates = 0/);
});
