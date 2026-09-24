# AkarFinder — HA/DR Parity, Reverse-Delta and RPO/RTO Specification

Date: 2026-09-24  
Status: DRAFT / OFFLINE DESIGN  
Scope: PostgreSQL data-plane only

## Goal

Define the exact evidence required to prove that:

1. Supabase → Neon synchronization preserves the approved HA dataset.
2. Neon incident writes can be isolated and replayed safely back to Supabase.
3. No split-brain, duplicate replay, sequence collision or silent divergence remains.
4. RPO and RTO are measured from observed timestamps/positions instead of assumed.

No production deployment, provider switch or live DB mutation is authorized by this document.

## Definitions

### Authoritative writer

Exactly one database is authorized for application writes at any moment.

### Baseline

A point-in-time dataset proven equal between Supabase and Neon before failover testing.

### Incident window

The period beginning immediately before Neon becomes writer and ending when Neon writes are frozen for final failback.

### Reverse delta

Only the changes produced during the Neon incident window that must be applied to Supabase before failback.

### Parity

Evidence that the compared HA datasets are equal according to all required dimensions below.

## Required parity dimensions

A failover/failback test is not valid if it checks only row counts.

For every approved HA table, capture and compare:

1. **Row count**
2. **Primary-key set**
3. **Deterministic row-content digest**
4. **Relevant version / updated_at timestamp state**
5. **Delete parity**
6. **Sequence / identity state when applicable**
7. **Foreign-key consistency**
8. **Schema fingerprint**
9. **Replica identity**
10. **Conflict / duplicate count**

## Deterministic row-content digest

The digest must be independent of physical row order.

Recommended logical contract:

- serialize each logical row deterministically;
- hash each row;
- sort row hashes;
- aggregate;
- hash the aggregate.

The exact implementation may differ, but:

- same logical contents must produce the same digest;
- ordering differences must not affect the result;
- NULL handling must be deterministic;
- JSON/object key ordering must be normalized;
- volatile columns must not be silently excluded unless explicitly justified.

## Primary-key set parity

Counts alone can hide substitution errors.

For every HA table:

- extract all primary keys;
- normalize ordering;
- hash the canonical key set;
- compare source and target.

If a table has a composite primary key, the composite tuple is the comparison unit.

A table without a primary key must be treated as a blocker until a safe identity strategy is documented.

## Timestamp / version parity

If a table contains fields such as:

- `updated_at`
- `version`
- `observed_at`
- `effective_at`
- `last_seen_at`

the exact failover test must verify that replicated logical records preserve the relevant temporal/version state.

This check supplements, not replaces, the content digest.

## Delete parity

Logical replication must be proven for deletions, not inferred from INSERT/UPDATE success.

Test:

1. insert a controlled test row on the active writer;
2. prove it appears on the standby;
3. delete it on the active writer;
4. prove it disappears on the standby within target RPO;
5. prove no tombstoned/duplicate row remains in an alternate representation.

If a table's replica identity cannot support DELETE safely, that table is not certified for HA.

## Sequence / identity parity

Logical replication does not automatically synchronize PostgreSQL sequence state.

For every sequence-backed HA column:

- capture source sequence metadata before failover;
- capture max replicated identifier;
- capture target sequence state;
- after reverse delta, reconcile the future writer's sequence;
- verify the next generated value cannot collide.

Minimum proof before promotion:

```text
next_sequence_value > maximum existing value that could collide
```

UUID-generated identifiers must still be inventoried; they are not assumed universal.

## Schema fingerprint

Logical replication does not apply DDL.

Before failover and failback, compute a deterministic schema fingerprint covering the approved HA tables, including:

- columns;
- data types;
- nullability;
- defaults;
- primary keys;
- unique constraints;
- foreign keys;
- replica identity;
- relevant indexes;
- generated/identity configuration.

Any unexpected fingerprint mismatch blocks the transition.

## Baseline proof — HA-03

Baseline is certified only if all required HA tables pass:

- count parity;
- PK-set parity;
- deterministic digest parity;
- schema fingerprint parity;
- sequence inventory captured;
- replica identity captured.

Record:

- timestamp;
- source transaction snapshot or equivalent stable point;
- exact application commit;
- exact schema version;
- exact table allowlist;
- source digest bundle;
- Neon digest bundle.

## Continuous synchronization proof — HA-04

For each mutation type:

### INSERT

Record:

- source commit timestamp;
- source logical identifier;
- time first visible on Neon;
- measured lag.

### UPDATE

Record:

- source update timestamp/version;
- expected content digest;
- time target reaches expected digest;
- measured lag.

### DELETE

Record:

- source delete timestamp;
- time target no longer returns the record;
- measured lag.

At least one controlled test per mutation type must pass on every mutation-capable HA domain before certification.

## Replication lag measurement

Do not infer lag from wall-clock timestamps alone if replication positions are available.

Capture where possible:

- publisher WAL LSN;
- slot confirmed/restart LSN;
- subscriber receive/replay position;
- application-observed visibility timestamp.

Store both:

- WAL/LSN evidence;
- end-to-end application visibility lag.

## RPO

### Definition

Measured data-loss exposure at failover.

For a test incident:

```text
RPO_observed =
  timestamp(last write committed on Supabase)
  - timestamp(last write proven present on Neon before promotion)
```

If exact commit chronology is unavailable, the test is insufficient for certified RPO.

### Initial design target

`RPO <= 60 seconds`

This is a target only. Certification uses the measured worst case across rehearsals.

## RTO

### Definition

Elapsed time from validated failover trigger to verified Neon service restoration.

```text
RTO_failover =
  timestamp(Neon read/write smoke test succeeds)
  - timestamp(failover decision recorded)
```

Failback RTO is recorded separately:

```text
RTO_failback =
  timestamp(Supabase post-promotion smoke test succeeds)
  - timestamp(failback freeze begins)
```

### Initial design target

`RTO_failover <= 15 minutes`

Again, this is a design target, not a certified value.

## Incident delta capture

Before the first Neon incident write, a deterministic delta boundary must exist.

Preferred evidence:

- logical replication slot / publication boundary;
- recorded starting LSN;
- exact activation timestamp.

If provider constraints prevent reliable pre-promotion logical capture, use an explicit application change journal for the approved HA write set.

A failover test where the delta start point is ambiguous is invalid.

## Reverse delta — HA-06

During reverse synchronization:

- Neon remains sole application writer.
- Supabase is a replication target only.
- The reverse stream must contain Neon-local incident changes, not replayed Supabase-origin changes.

Preferred PostgreSQL 17 strategy, only after exact-provider proof:

- reverse subscription with `copy_data = false`;
- origin filtering such as `origin = none`;
- record start and target LSNs.

## Anti-loop proof

The following sequence must be explicitly tested:

1. create/update row on Supabase;
2. allow forward replication to Neon;
3. begin reverse path;
4. prove the forwarded Supabase change is **not** emitted back as a new Neon-local change;
5. create/update a Neon-local incident row;
6. prove that row is emitted exactly once to Supabase;
7. prove no forward/reverse replay loop appears.

Pass criteria:

- zero duplicate application;
- zero endless WAL churn caused by replay;
- zero conflict count;
- exact final digest parity.

If this cannot be proven, the mandatory fallback is:

1. complete incident reconciliation;
2. keep one writer only;
3. rebuild/rebaseline Neon from authoritative Supabase;
4. establish a fresh forward replication topology.

## Reverse-delta idempotency

Re-running recovery after interruption must not duplicate logical data.

Test:

- interrupt reverse sync;
- restart;
- prove already-applied changes are not duplicated;
- prove remaining delta completes;
- final digests equal.

## Conflict policy

The design intent is to prevent write conflicts through single-writer fencing.

Therefore a same-record dual modification is a **failure condition**, not a normal merge workflow.

If detected:

- stop failback;
- identify which writer violated fencing;
- preserve both versions for forensic review;
- do not apply a last-write-wins policy automatically.

## Final failback freeze

Before Supabase promotion:

1. enter `FAILBACK_FREEZE`;
2. stop Neon application writes;
3. verify both application writers are disabled;
4. drain final reverse delta;
5. record final target LSN;
6. reconcile sequences;
7. verify schema fingerprint;
8. execute final parity bundle.

Only after all pass may Supabase become writer.

## Final parity bundle

The certification artifact for a failback rehearsal must contain per-table:

- source count;
- target count;
- PK-set digest;
- content digest;
- delete-test result;
- relevant timestamp/version result;
- sequence state result;
- schema fingerprint;
- replica identity;
- conflict count.

Global metadata:

- application commit;
- schema version;
- failover start/end;
- reverse sync start/end;
- final LSNs;
- measured RPO;
- measured failover RTO;
- measured failback RTO.

## Acceptance thresholds

### Hard PASS

- counts equal;
- PK-set digests equal;
- content digests equal;
- no missing deletes;
- schema fingerprints equal;
- sequence collision risk = zero;
- conflicts = 0;
- duplicates = 0;
- single-writer invariant never violated;
- reverse loop = 0.

### Performance target PASS

Initial engineering targets:

- observed RPO <= 60 s;
- observed failover RTO <= 15 min.

If data integrity passes but targets are missed, the architecture is **functionally safe but not performance-certified**.

## Stop conditions

Immediately stop the transition on:

- dual-writer reachability;
- unknown delta boundary;
- schema mismatch;
- replica-identity blocker;
- PK-set mismatch;
- content digest mismatch;
- sequence collision risk;
- reverse loop;
- duplicate/conflict;
- inability to identify the last applied replication position.

## Required rehearsal count

Before production certification:

- minimum 3 complete failover/failback rehearsals;
- at least one with interrupted forward replication;
- at least one with interrupted reverse replication;
- at least one prolonged outage scenario.

The certified RPO/RTO values are the worst observed successful values, not the best.

## Evidence retention

Every rehearsal should persist a machine-readable artifact, recommended:

`artifacts/ha-dr/<run-id>/HA_DR_EVIDENCE.json`

and a human-readable summary:

`artifacts/ha-dr/<run-id>/HA_DR_EVIDENCE.md`

Do not commit secrets or connection strings into those artifacts.

## Current status

As of 2026-09-24:

- Supabase SQL still fails with `57P03 / Hot standby mode is disabled`.
- No live baseline or replication proof is currently possible.
- This specification is therefore design evidence only.
- The next live step remains the read-only capability inventory once Supabase accepts SQL again.
