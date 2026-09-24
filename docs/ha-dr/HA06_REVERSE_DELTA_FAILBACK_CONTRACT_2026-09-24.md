# AkarFinder — HA-06 Reverse Delta / Failback Contract

Date: 2026-09-24  
Status: DRAFT / NO LIVE REPLICATION CHANGE AUTHORIZED  
Scope: controlled Neon → Supabase reconciliation and failback

## Goal

Return from `NEON_PRIMARY` to `SUPABASE_PRIMARY` without:

- losing Neon incident writes;
- replaying Supabase-origin changes back into Supabase;
- creating a replication loop;
- duplicating logical records;
- colliding sequence-generated identifiers;
- enabling both application writers.

## Preconditions

HA-06 is BLOCKED unless all are true:

1. HA-05 failover rehearsal is functionally green.
2. Neon is the only application writer.
3. Supabase SQL is healthy again.
4. Supabase application writes remain fenced.
5. Incident start boundary is known.
6. Reverse-delta start boundary can be established deterministically.
7. Supabase schema is compatible with the incident schema version.
8. Reverse replication capabilities/privileges are proven on both providers.
9. Sequence/identity inventory exists for every HA table.
10. A tested fallback rebaseline procedure exists.
11. Explicit approval exists for any live replication-configuration mutation.

## Legal state path

Only:

```text
NEON_PRIMARY
  -> FAILBACK_SYNC
  -> FAILBACK_FREEZE
  -> SUPABASE_PRIMARY
```

Rollback paths:

```text
FAILBACK_SYNC -> NEON_PRIMARY
FAILBACK_FREEZE -> NEON_PRIMARY
```

Direct:

```text
NEON_PRIMARY -> SUPABASE_PRIMARY
```

is forbidden.

## HA06-T01 — verify recovered Supabase

Do not trust provider control-plane status alone.

Required:

- `SELECT 1` succeeds;
- read-only replication capability inventory succeeds;
- schema fingerprint collected;
- replica identities collected;
- sequence metadata collected;
- existing slots/subscriptions inspected;
- no unexpected schema drift.

Supabase remains non-writer.

## HA06-T02 — reconcile schema before data

Logical replication does not apply DDL.

Before reverse delta:

1. identify exact schema version used by Neon incident writer;
2. compare Supabase schema fingerprint;
3. apply only reviewed compatible schema changes through the normal migration process;
4. re-run schema fingerprint;
5. proceed only when compatible.

Schema mismatch = BLOCKED.

Do not use data replication to hide DDL drift.

## HA06-T03 — enter FAILBACK_SYNC

Actions conceptually required:

1. set HA state = `FAILBACK_SYNC`;
2. keep Neon application writes enabled;
3. keep Supabase application writes disabled;
4. record reverse-sync start timestamp;
5. record reverse start LSN;
6. define reverse target LSN / incident delta boundary.

Single-writer proof must remain Neon-only.

## HA06-T04 — reverse subscription safety

Preferred PostgreSQL 17 path, only after provider-specific proof:

- reverse publication on Neon for approved HA tables;
- reverse subscription on Supabase;
- `copy_data = false` only when Supabase already contains the proven baseline and the incident boundary is exact;
- replication origin filtering such as `origin = none` only when exact behavior is proven on the deployed PostgreSQL/provider versions.

No command may be copied into production blindly from this contract.

## HA06-T05 — anti-loop proof

Mandatory rehearsal:

1. identify a row originally written on Supabase before failover;
2. prove it replicated forward to Neon;
3. activate the tested reverse path;
4. prove that forwarded Supabase-origin change is not re-emitted as a new local Neon incident change;
5. create or identify a Neon-local incident canary change;
6. prove it reaches Supabase exactly once;
7. prove it does not create endless forward/reverse replay;
8. record WAL/LSN movement.

PASS:

- Supabase-origin replay count = 0;
- Neon-local incident apply count = 1;
- conflicts = 0;
- duplicates = 0;
- no endless WAL churn caused by replay.

Any loop evidence = FAIL.

## HA06-T06 — interrupted reverse-sync idempotency

At least one rehearsal must interrupt the reverse-sync worker through a tested reversible mechanism.

After restart:

- already applied incident changes are not duplicated;
- remaining delta completes;
- final logical content parity is exact;
- conflicts remain zero.

Slot/publication destruction is not an acceptable interruption test.

## HA06-T07 — sequence / identity reconciliation

Logical replication does not synchronize sequence state.

For every sequence-backed HA column:

Record:

- sequence name;
- increment;
- `last_value`;
- `is_called` where available;
- maximum existing identifier on Supabase;
- maximum existing identifier on Neon.

Before Supabase can become writer, prove the next generated Supabase value cannot collide with any replicated identifier.

For positive increments, the safety check must account for `is_called` semantics.

Do not blindly set every sequence to `max(id)`; preserve correct increment/start semantics and verify the next-value safety mathematically.

UUID primary keys require no sequence repair but remain part of the inventory.

Sequence risk = BLOCKED or FAIL, never warning-only.

## HA06-T08 — reverse-delta catch-up

While Neon remains writer:

- monitor reverse subscriber position;
- compare to target LSN;
- record lag;
- do not enable Supabase writes.

When reverse target is reached, do not promote yet: enter final freeze.

## HA06-T09 — enter FAILBACK_FREEZE

Actions:

1. set state = `FAILBACK_FREEZE`;
2. fence Neon application writes;
3. keep Supabase writes fenced;
4. verify both application writers are disabled;
5. record failback-freeze timestamp;
6. capture final Neon WAL/incident position;
7. drain final reverse delta;
8. record reverse final LSN.

If both writers cannot be proven disabled, FAIL.

## HA06-T10 — final parity

After final drain, run the complete HA evidence contract for the approved business-table set:

- row counts;
- PK-set digests;
- content digests;
- relevant timestamps/version state;
- delete parity;
- schema fingerprints;
- replica identities;
- sequence safety;
- conflicts = 0;
- duplicates = 0.

Also verify canary cleanup.

Any mismatch = FAIL; remain in `FAILBACK_FREEZE` only while safe, otherwise roll back to `NEON_PRIMARY`.

## HA06-T11 — promote Supabase

Only after HA06-T10 PASS:

1. enable Supabase application writer;
2. set state = `SUPABASE_PRIMARY`;
3. keep Neon application writer disabled;
4. record promotion timestamp;
5. run minimal read smoke proof;
6. run approved canary write smoke proof only if separately authorized;
7. observe application DB errors.

Direct failback without final parity is forbidden.

## HA06-T12 — re-establish Neon standby

Do not leave an unproven bidirectional topology active.

Two allowed post-failback strategies:

### Strategy A — proven origin-safe forward topology

Allowed only if exact-provider tests prove:

- no reverse replay loop;
- reverse topology is safely removed/fenced;
- forward Supabase → Neon subscription resumes from a known safe boundary.

### Strategy B — rebaseline fallback

Default fail-safe when origin semantics are uncertain:

1. Supabase remains sole writer;
2. disable/remove reverse topology through reviewed operations;
3. rebuild/rebaseline Neon from authoritative Supabase;
4. prove HA-03 parity;
5. establish a fresh forward replication path;
6. prove HA-04 again.

Strategy B is slower but safer than an unproven bidirectional topology.

## `copy_data = false` rule

Use only if all are true:

- target Supabase already contains the exact baseline;
- baseline parity is recent and proven;
- reverse start point is exact;
- no incident row predates the capture boundary without being represented on Supabase.

Otherwise use a reviewed rebaseline/reconciliation plan.

## `origin = none` rule

Treat this as a candidate safety primitive, not an assumption.

Before production use, prove on the exact Supabase/Neon PostgreSQL versions that:

- forward-replicated Supabase-origin changes applied on Neon retain an origin distinguishable from Neon-local incident writes;
- the reverse subscriber configured with the intended origin filter excludes those forwarded changes;
- Neon-local incident writes still replicate.

If any of these cannot be demonstrated, origin filtering is not certified and Strategy B rebaseline becomes mandatory.

## Conflict policy

The desired conflict count is zero because single-writer fencing should prevent concurrent logical edits.

If the same logical record differs unexpectedly:

- stop failback;
- preserve both representations;
- identify the violated writer/fencing invariant;
- do not auto-resolve using last-write-wins;
- classify as FAIL.

## Failback RTO

Measure:

```text
observed_failback_rto =
  timestamp(Supabase verified service restoration)
  - timestamp(FAILBACK_FREEZE begins)
```

This is separate from failover RTO.

No target value is certified until rehearsals produce observed data.

## Evidence artifact

Phase:

`FAILBACK`

Required:

- reverse_start_lsn;
- reverse_target_lsn;
- reverse_final_lsn;
- observed RPO;
- observed failover RTO;
- observed failback RTO;
- single-writer proof;
- full table parity;
- sequence safety;
- schema fingerprint;
- conflicts = 0;
- duplicates = 0;
- origin-filter test result;
- reverse interruption/idempotency result.

## PASS

- legal state path only;
- Neon sole writer during reverse sync;
- anti-loop proof green;
- reverse-sync restart idempotent;
- sequence safety green;
- final freeze proven;
- final parity exact;
- conflicts = 0;
- duplicates = 0;
- Supabase enabled only after all gates pass;
- Neon writer disabled after promotion.

## BLOCKED

- Supabase SQL not healthy;
- reverse capability/privilege unknown;
- schema drift unresolved;
- incident/reverse LSN unknown;
- sequence safety unknown;
- origin semantics unproven and rebaseline path unavailable;
- approval for live replication mutation absent.

## FAIL

- both writers active;
- reverse loop;
- duplicate replay;
- conflict;
- data mismatch;
- missing delete;
- sequence collision risk;
- Supabase enabled before final parity;
- direct `NEON_PRIMARY → SUPABASE_PRIMARY` transition.

## Current state

As of 2026-09-24:

- no reverse subscription/publication has been created;
- no failback rehearsal has run;
- Supabase SQL remains unavailable;
- HA-06 execution is BLOCKED;
- this document authorizes no live replication mutation.
