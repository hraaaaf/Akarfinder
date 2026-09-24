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

Supabase is intentionally **PAUSED by the operator pending restore**.

Rules while paused:

- do not probe SQL;
- do not infer readiness from provider control-plane status;
- do not run capability inventory, migration validation, baseline parity or any provider mutation;
- resume the live path only after an explicit operator signal that restore is complete.

The last pre-pause SQL symptom was `57P03 / Hot standby mode is disabled`, but it is historical context, not the current health claim.

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
- last pre-pause direct SQL probe returned `57P03 / Hot standby mode is disabled`.

### Missing proof

- successful `SELECT 1`;
- source secret available to the workflow;
- 5/5 PG17 validation jobs green.

### Status

`BLOCKED — OPERATOR PAUSED / RESTORE PENDING`

### Next exact

Only after the operator explicitly signals restore complete:

1. run one `SELECT 1`;
2. if green, record recovery/read-only state;
3. run read-only capability inventory;
4. dispatch the PG17 validation suite once;
5. diagnose only the first real failure if not green.

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
- isolated HA03-A baseline parity detector rehearsal;
- 16-table candidate set;
- count parity;
- PK-set digest parity;
- content digest parity;
- schema fingerprint;
- replica identity;
- sequence/identity metadata + state comparison (including increment/cache/last_value);
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
- no provider canary DB object or mutation has been executed;
- isolated PG17 resilience run `36005375751` completed SUCCESS on exact implementation HEAD `33c586e1accb78afaf6482e0552778949ed6f6be`;
- artifact `10810640827`, digest `sha256:342230feba634ef58a32034bd82d6b40da2158b173997ee8de6e6450d847a0a8`;
- forward subscription disable preserved stale target state;
- after re-enable, forward INSERT/UPDATE/DELETE catch-up passed;
- forward pause/catch-up LSNs were captured.

### Missing proof

- canary schema applied to both provider databases;
- forward logical replication active on exact providers;
- INSERT/UPDATE/DELETE observed on provider target;
- measured provider forward RPO proxy.

### Status

`HA04-A ISOLATED RESILIENCE PROVED / HA04-B PROVIDER SYNC NOT EXECUTED`

### Human gate

Required before production DB schema/mutation rehearsal.

### Next exact

Only after HA-03 green: authorize/apply canary schema, then run HA-04 rehearsal.

## HA-05 — Failover simulation

### Goal

Prove legal failover with no split-brain.

### Prepared

- isolated rehearsal first;
- isolated two-node PostgreSQL 17 logical-replication workflow;
- forward + reverse canary INSERT/UPDATE/DELETE;
- `copy_data=false` + `origin=none` anti-loop rehearsal;
- explicit artifact limitation: no provider-specific certification;
- production rehearsal gate;
- legal state path:
  `SUPABASE_PRIMARY → FAILOVER_PREP → NEON_PRIMARY`;
- no-write-window evidence;
- incident boundary requirement;
- provider-routing proof;
- rollback paths;
- failover RTO definition.

### Proved

- isolated rehearsal workflow + static guard exist in the HA branch;
- run `35993759291` completed green on disposable PostgreSQL 17 nodes;
- forward INSERT/UPDATE/DELETE, reverse INSERT/UPDATE/DELETE, anti-loop count proof, cleanup, DB-role writer fencing, failover no-write window, target promotion, failback freeze and source-writer restore all passed;
- artifact `10805453500` was produced with secret redaction and explicit provider/prod limitations.

### Evidence-quality note

The first green artifact had two evidence-quality defects (synthetic GitHub execution SHA in `application_commit`, second-resolution timing). Both were corrected and re-run.

Latest fully green implementation-head proof:
- run `36008017163` → SUCCESS;
- artifact `10811507019`;
- artifact digest `sha256:dec81e0eabe5d93aae63ddad245ca2a0a0dfae25108d3cfce7e28729241f8f37`;
- `application_commit = ec99cd402d434520fab3911c6b4844c3b21ee705`;
- `github_execution_sha = 7ccfaf1c4f526a35b75f89483b27d61f207210a9`;
- isolated failover decision → target writer promotion = `387 ms`;
- verdict = `ISOLATED_REHEARSAL_PASS`;
- same implementation head also had Neon Runtime, Efficiency and HA04-A/HA06-A resilience checks green.

HA05-A isolated PostgreSQL 17 rehearsal evidence is therefore **PROVED** on the latest fully green implementation head. This is not provider-specific or production certification.

### Missing proof

- writer fencing behavior on the real application routing layer;
- Neon promotion smoke proof;
- incident write boundary;
- observed failover RTO;
- production rehearsal approval if HA05-B is ever run.

### Status

`HA05-A PROVED / HA05-B PROVIDER REHEARSAL NOT EXECUTED`

### Human gate

Required for any production provider switch and any Vercel deployment/environment cutover.

## HA-06 — Reverse delta / failback

### Goal

Reconcile Neon incident writes back to Supabase and restore Supabase as sole writer.

### Prepared

- reverse-delta/failback contract;
- isolated HA06-B sequence/identity failback reconciliation rehearsal;
- legal path:
  `NEON_PRIMARY → FAILBACK_SYNC → FAILBACK_FREEZE → SUPABASE_PRIMARY`;
- origin-filter proof requirement;
- `copy_data = false` guard;
- reverse interruption/idempotency proof;
- sequence reconciliation;
- final parity;
- rebaseline fallback.

### Proved

- no reverse replication has been created or run on live providers;
- isolated PG17 resilience run `36005375751` completed SUCCESS on exact implementation HEAD `33c586e1accb78afaf6482e0552778949ed6f6be`;
- reverse subscription disable preserved stale source state;
- after re-enable, reverse INSERT/UPDATE/DELETE catch-up passed;
- `origin=none` anti-loop / duplicate-conflict proof passed;
- subscription workers healthy after recovery;
- reverse pause/catch-up LSNs were captured.

### Missing proof

- Neon→Supabase provider capabilities;
- exact provider origin semantics;
- provider reverse-delta rehearsal;
- sequence repair proof;
- final provider parity;
- failback RTO.

### Status

`HA06-A ISOLATED RESILIENCE PROVED / PROVIDER FAILBACK NOT EXECUTED`

### Human gate

Required before live publication/subscription changes or failback.

## HA-07 — Runbook / guardrails

### Goal

Provide an operator-safe, auditable procedure for failover/failback.

### Prepared

- operator runbook v0 with planned pause/restore recovery mode;
- static runbook guard;
- state-machine guard;
- evidence schema with foreign-key consistency requirement;
- phase-aware evidence evaluator with writer-state invariants;
- offline evidence certification wrapper + CLI;
- readiness matrix;
- stop/rollback conditions.

### Proved

- repository documentation and static contracts exist;
- isolated HA05-A exact-head rehearsal is green;
- isolated HA04-A/HA06-A resilience rehearsal is green with artifact evidence;
- Neon Runtime and Efficiency guards were green on implementation HEAD `33c586e1accb78afaf6482e0552778949ed6f6be`.

### Missing proof

- current branch exact-head green after final documentation closeout;
- exact operator commands tested against actual providers;
- measured thresholds and final runbook revision.

### Status

`PREPARED / NOT CERTIFIED`

## First live gate sequence

**Frozen while Supabase is operator-paused.**

After an explicit restore-complete signal:

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

## CI status source of truth

Do not freeze an ephemeral CI state in this canonical file.

For the current exact-head status, read:

1. GitHub PR #1087;
2. the exact-head workflow runs;
3. the AkarFinder Notion command center.

Certification requires the relevant exact-head checks to be green. A queued or in-progress CI does not stop independent work.

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
