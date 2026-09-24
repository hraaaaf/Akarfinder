# AkarFinder — Supabase ↔ Neon HA/DR Operator Runbook v0

Date: 2026-09-24
Status: DRAFT / NOT PRODUCTION-ACTIVE
Scope: PostgreSQL data-plane failover/failback only

## Hard rules

- Exactly one application writer at a time.
- Never promote Neon before Supabase writes are fenced.
- Never fail back to Supabase before reverse delta, schema, sequence and parity gates pass.
- Never use pooled URLs for logical replication or dump/restore operations.
- Never expose secret values in logs, docs or chat.
- No Vercel production deployment without explicit authorization.
- Auth and Storage are separate failure domains and are not covered by this DB-only runbook.

## Required operator evidence

Before every state transition, record:

- timestamp;
- current HA state;
- current writer;
- exact commit/HEAD;
- exact schema version/fingerprint;
- latest known replication position;
- replication lag;
- last successful parity result;
- active incident/ticket reference if any.

## State machine

Allowed states:

- SUPABASE_PRIMARY
- FAILOVER_PREP
- NEON_PRIMARY
- FAILBACK_SYNC
- FAILBACK_FREEZE

Allowed writer mapping:

- SUPABASE_PRIMARY → Supabase
- FAILOVER_PREP → none
- NEON_PRIMARY → Neon
- FAILBACK_SYNC → Neon
- FAILBACK_FREEZE → none

Direct SUPABASE_PRIMARY → NEON_PRIMARY is forbidden.
Direct NEON_PRIMARY → SUPABASE_PRIMARY is forbidden.

## 0. Preconditions

Do not begin HA activation unless all are true:

1. Baseline parity has been proven.
2. Forward logical replication has been proven on the approved table allowlist.
3. INSERT/UPDATE/DELETE replication has been tested.
4. Replica identity and PK requirements are proven.
5. Sequence-backed identifiers are inventoried.
6. Schema migration discipline is documented.
7. Split-brain guard is tested.
8. Reverse-delta method is tested.
9. Operator credentials/secrets exist in their approved stores.
10. Rollback path is rehearsed.

If any precondition is false, use incident containment rather than database failover.

## 1. Incident detection

Goal: decide whether the database failure crosses the failover threshold.

Observe:

- SQL health, not only provider control-plane status;
- application DB error rate;
- connection failures;
- replication lag;
- provider incident status if available.

Do not fail over solely because the provider dashboard says degraded.

Required evidence:

- one authoritative SQL probe result;
- exact error;
- timestamp;
- last known replication lag.

If the failure is transient and below the operational threshold, remain on Supabase.

## 2. Enter FAILOVER_PREP

Goal: remove write authority before changing writer.

Actions:

1. Set HA control state to FAILOVER_PREP.
2. Fence all application writes to Supabase.
3. Confirm both writers are disabled.
4. Record last known forward replication position.
5. Confirm Neon schema version matches the application version.
6. Confirm incident-delta capture point exists before enabling Neon writes.

Required proof:

- write path to Supabase fails closed;
- write path to Neon still disabled;
- state-machine guard accepts FAILOVER_PREP;
- exact replication position recorded.

STOP if Supabase writes cannot be reliably fenced.

## 3. Promote Neon

Goal: make Neon the sole writer.

Actions:

1. Verify FAILOVER_PREP preconditions again.
2. Enable Neon writer.
3. Set state to NEON_PRIMARY.
4. Verify Supabase application writer remains disabled.
5. Run minimal read/write smoke test on Neon using non-production test data or an approved test record.
6. Start incident-window delta tracking.

Required proof:

- single-writer guard reports Neon only;
- smoke test passes;
- Supabase write path remains fenced;
- first incident write timestamp is recorded.

STOP immediately on any sign of dual-write reachability.

## 4. Operate in NEON_PRIMARY

Goal: keep the incident window bounded and observable.

Monitor:

- Neon write success/error rate;
- replication/delta capture health;
- incident-window data volume;
- sequence/identity behavior;
- schema changes.

Rules:

- avoid schema changes during incident unless operationally unavoidable;
- if schema must change, record the exact migration and ensure Supabase receives the same compatible change before failback;
- keep Supabase application writes disabled even if SQL health returns.

## 5. Supabase recovery check

Goal: confirm source is healthy enough to receive reverse delta.

Actions:

1. Run one SQL health probe.
2. Run read-only HA capability inventory.
3. Verify:
   - server version;
   - wal_level;
   - replication settings;
   - replica identity;
   - PKs;
   - sequence state;
   - slots/subscriptions;
   - schema compatibility.

Do not switch writer yet.

Required proof:

- SQL probe succeeds;
- capability inventory completes;
- no unresolved schema incompatibility exists.

## 6. Enter FAILBACK_SYNC

Goal: keep Neon as writer while synchronizing incident changes back.

Actions:

1. Set state to FAILBACK_SYNC.
2. Keep Neon as the sole application writer.
3. Configure/enable reverse delta according to the tested mechanism.
4. Prefer origin filtering such as origin = none only if proven on the exact provider/version combination.
5. If baseline is already present and the capture point is proven, use copy_data = false.
6. Monitor until the reverse target position is reached.

Required proof:

- Supabase remains non-writer;
- reverse delta advances;
- no replication loop;
- no duplicate/conflict growth.

STOP if origin filtering behavior is uncertain or loop evidence appears.

Fallback:

- stop reverse replication;
- retain Neon as writer;
- perform controlled rebaseline after reconciliation.

## 7. Reconcile sequences and schema

Goal: make Supabase safe to generate new writes.

Sequence checks:

- inventory all sequence-backed columns;
- compare max replicated identifiers;
- repair destination sequence values as required;
- verify next generated value cannot collide.

Schema checks:

- exact migration version/fingerprint must match;
- no unresolved DDL drift;
- generated/default columns compatible;
- triggers and constraints compatible.

Required proof:

- sequence evidence stored;
- schema fingerprint match stored.

## 8. Enter FAILBACK_FREEZE

Goal: obtain a final deterministic cutover point.

Actions:

1. Set state to FAILBACK_FREEZE.
2. Disable Neon application writes.
3. Confirm both writers are disabled.
4. Drain the final reverse delta.
5. Record final target position.
6. Run final parity suite.

Final parity must include, for the approved HA table set:

- row counts;
- PK sets;
- deterministic content digests;
- timestamps/version fields where applicable;
- delete parity;
- sequence state;
- zero duplicate/conflict anomalies.

STOP if any parity gate fails.

## 9. Promote Supabase

Goal: return Supabase to sole writer.

Actions:

1. Verify FAILBACK_FREEZE proof set.
2. Enable Supabase application writer.
3. Set state to SUPABASE_PRIMARY.
4. Keep Neon application writes disabled.
5. Run minimal read/write smoke test.
6. Observe error rate and consistency.

Required proof:

- single-writer guard reports Supabase only;
- smoke test passes;
- application errors remain within expected bounds.

## 10. Re-establish Neon standby

Do not reuse an unproven bidirectional topology.

Preferred safe path after failback:

1. stop/remove reverse incident synchronization according to the tested runbook;
2. ensure Supabase is authoritative;
3. either:
   - re-enable forward replication only if no-loop origin semantics are proven; or
   - rebuild/rebaseline Neon from Supabase, then establish fresh forward replication.

The rebaseline path is the default fail-safe if origin behavior is uncertain.

## 11. Abort / rollback conditions

Abort the current transition if any occurs:

- both databases accept application writes;
- schema versions diverge unexpectedly;
- reverse replication loops or conflicts;
- sequence collision risk;
- parity mismatch;
- replication position cannot be established;
- delta capture point is missing;
- secrets/connection mode are wrong;
- provider privileges do not support the required primitive.

Rollback direction depends on state:

- FAILOVER_PREP → SUPABASE_PRIMARY if Supabase is healthy and writes were not transferred.
- FAILBACK_SYNC → NEON_PRIMARY if reverse sync becomes unsafe.
- FAILBACK_FREEZE → NEON_PRIMARY if final parity fails.

## 12. Post-incident closeout

Record:

- incident start/end;
- measured RPO;
- measured RTO;
- amount of data lost, if any;
- conflict/duplicate count;
- failover duration;
- failback duration;
- provider incidents;
- all operator actions;
- all commit SHAs;
- all migration/schema versions;
- all replication positions;
- final parity proof.

Then update:

- HA architecture canon;
- operational runbook;
- Notion command center;
- repo handover.

## Command policy

This v0 runbook deliberately does not hardcode live secret-bearing commands.

Before production certification, add exact commands for:

- health probes;
- publication/subscription inspection;
- slot inspection;
- lag inspection;
- state-machine control;
- writer fencing;
- reverse-delta activation;
- sequence reconciliation;
- parity suite;
- rollback.

Each command must be tested in a non-production rehearsal and must not print secret values.

## Current project state

As of 2026-09-24:

- Supabase SELECT 1 still fails with 57P03 / Hot standby mode is disabled.
- HA-01 remains blocked.
- PR #1087 contains the HA/DR design and offline single-writer guards.
- No production deployment, provider switch or DB write is authorized by this file.
