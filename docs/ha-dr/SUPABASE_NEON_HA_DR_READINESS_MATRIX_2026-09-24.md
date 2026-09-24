# AkarFinder — Supabase ↔ Neon HA/DR Readiness Matrix

Date: 2026-09-24  
Status: ACTIVE TRACKING / NOT CERTIFIED

## Purpose

Separate:

- **prepared** = code/docs/tests exist;
- **proved** = direct evidence exists;
- **certified** = all required gates for the lot passed.

A prepared artifact must never be presented as a live HA capability.

## Current verified blocker

Supabase SQL remains unavailable:

```text
57P03: the database system is not accepting connections
DETAIL: Hot standby mode is disabled.
```

Control-plane health is not sufficient.

## HA-01 — Source recovery + PG17 validation suite

### Goal

Supabase accepts SQL and the source portability validation suite reaches 5/5 green.

### Prepared

- `Neon Migration Validation Suite`
- source-only PostgreSQL 17 scratch validation
- count + deterministic content digest gates
- `SUPABASE_DATABASE_URL_DIRECT` secret contract

### Proved

- workflow exists;
- previous dispatch produced all 5 expected jobs;
- all 5 stopped at the source-secret gate in the prior window;
- current direct SQL probe still returns 57P03.

### Missing proof

- successful `SELECT 1`;
- source secret available to the workflow;
- 5/5 PG17 validation jobs green.

### Status

`BLOCKED`

### Next exact

At the next justified source-health checkpoint:

1. run one `SELECT 1`;
2. if green, run read-only capability inventory;
3. dispatch the PG17 validation suite once;
4. diagnose only the first real failure if not green.

## HA-02 — Architecture / replication design

### Goal

Define safe Supabase-primary / Neon-standby topology and failback strategy.

### Prepared

- architecture canon;
- single-writer state machine;
- split-brain guards;
- read-only capability inventory SQL;
- evidence schema/template;
- phase-aware evidence evaluator;
- parity/RPO/RTO specification.

### Proved

- repository artifacts exist;
- legal state transitions are statically encoded;
- PR #1087 contains the design overlay.

### Missing proof

- live provider capabilities;
- live replica identities;
- live sequence/identity inventory;
- origin-filter behavior on exact providers;
- observed RPO/RTO.

### Status

`PREPARED / NOT CERTIFIED`

### Next exact

Run the capability inventory on both live databases when Supabase returns.

## HA-03 — Baseline Supabase → Neon

### Goal

Prove approved HA datasets are equal before continuous replication/failover testing.

### Prepared

- manual read-only baseline parity workflow;
- 16-table candidate set;
- count parity;
- PK-set digest parity;
- content digest parity;
- schema fingerprint;
- replica identity;
- sequence/identity metadata comparison;
- secret leakage guard;
- artifact explicitly marked `NOT_CERTIFIED`.

### Proved

- workflow/guard exist in draft branch only.

### Missing proof

- Neon baseline import;
- source↔Neon live parity artifact;
- sequence collision-safety evidence;
- single-writer evidence.

### Status

`PREPARED / BLOCKED BY HA-01 + IMPORT`

### Next exact

After HA-01 and validated baseline import, run the read-only baseline parity workflow.

## HA-04 — Continuous sync proof

### Goal

Prove INSERT/UPDATE/DELETE propagation and measure forward lag.

### Prepared

- isolated canary migration;
- canary migration guard;
- HA-04 rehearsal contract;
- no business-table mutation strategy;
- LSN + visibility-lag evidence requirements;
- cleanup contract;
- publication-membership proof requirement.

### Proved

- repository migration exists only;
- no canary DB object or mutation has been executed.

### Missing proof

- canary schema applied to both databases;
- forward logical replication active;
- INSERT/UPDATE/DELETE observed on target;
- interruption/restart catch-up proof;
- measured forward RPO proxy.

### Status

`PREPARED / NOT EXECUTED`

### Human gate

Required before production DB schema/mutation rehearsal.

### Next exact

Only after HA-03 green: authorize/apply canary schema, then run HA-04 rehearsal.

## HA-05 — Failover simulation

### Goal

Prove legal failover with no split-brain.

### Prepared

- isolated rehearsal first;
- production rehearsal gate;
- legal state path:
  `SUPABASE_PRIMARY → FAILOVER_PREP → NEON_PRIMARY`;
- no-write-window evidence;
- incident boundary requirement;
- provider-routing proof;
- rollback paths;
- failover RTO definition.

### Proved

No simulation has run.

### Missing proof

- HA05-A isolated rehearsal;
- writer fencing behavior;
- Neon promotion smoke proof;
- incident write boundary;
- observed failover RTO;
- production rehearsal approval if HA05-B is ever run.

### Status

`PREPARED / NOT EXECUTED`

### Human gate

Required for any production provider switch and any Vercel deployment/environment cutover.

## HA-06 — Reverse delta / failback

### Goal

Reconcile Neon incident writes back to Supabase and restore Supabase as sole writer.

### Prepared

- reverse-delta/failback contract;
- legal path:
  `NEON_PRIMARY → FAILBACK_SYNC → FAILBACK_FREEZE → SUPABASE_PRIMARY`;
- origin-filter proof requirement;
- `copy_data = false` guard;
- reverse interruption/idempotency proof;
- sequence reconciliation;
- final parity;
- rebaseline fallback.

### Proved

No reverse replication has been created or run.

### Missing proof

- Neon→Supabase provider capabilities;
- exact origin semantics;
- reverse-delta rehearsal;
- anti-loop proof;
- sequence repair proof;
- final parity;
- failback RTO.

### Status

`PREPARED / NOT EXECUTED`

### Human gate

Required before live publication/subscription changes or failback.

## HA-07 — Runbook / guardrails

### Goal

Provide an operator-safe, auditable procedure for failover/failback.

### Prepared

- operator runbook v0;
- static runbook guard;
- state-machine guard;
- evidence schema;
- readiness matrix;
- stop/rollback conditions.

### Proved

Repository documentation and static contracts exist.

### Missing proof

- CI exact-head green;
- non-production rehearsal results;
- exact operator commands tested against actual providers;
- measured thresholds and final runbook revision.

### Status

`PREPARED / NOT CERTIFIED`

## First live gate sequence

When Supabase next returns SQL:

### Gate L1 — minimal health

One query:

```sql
select 1;
```

If red: stop live work.

### Gate L2 — read-only capability inventory

Run against Supabase and Neon:

- PostgreSQL version;
- wal_level;
- replication privileges;
- slot/sender/worker settings;
- table PKs;
- replica identity;
- sequences/identity columns;
- existing slots/subscriptions.

No DDL/DML.

### Gate L3 — PG17 source portability suite

Require 5/5 green.

### Gate L4 — Neon target state / baseline decision

Verify target emptiness/current state and decide whether baseline import can safely proceed.

### Gate L5 — HA-03 baseline parity

After import, run full read-only parity proof.

Only after L5 may HA-04 mutation rehearsal be considered.

## Current CI

Exact-head CI for the HA overlay was in progress at the last check:

- Neon Runtime Read Path Validation
- CI Workflow Efficiency Policy

CI in progress does not stop independent work.

## Current production mutations

None from this HA/DR branch:

- no Vercel deploy;
- no provider switch;
- no Supabase write;
- no Neon write;
- no replication publication/subscription creation;
- canary migration not applied.

## Current repository tracking

- Repo: `hraaaaf/Akarfinder`
- HA branch: `infra/supabase-neon-ha-dr-20260924`
- PR: `#1087` DRAFT
- Base: `infra/neon-migration-20260923`

Exact HEAD must be re-read before any merge/certification claim.
