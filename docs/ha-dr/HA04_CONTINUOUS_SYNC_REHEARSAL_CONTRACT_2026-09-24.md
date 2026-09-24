# AkarFinder — HA-04 Continuous Sync Rehearsal Contract

Date: 2026-09-24  
Status: DRAFT / NOT EXECUTABLE WITHOUT PRODUCTION GATE  
Scope: forward Supabase → Neon logical replication proof

## Goal

Prove continuous synchronization under normal operation without mutating business tables.

The rehearsal uses only:

`public.akarfinder_ha_replication_canary`

No listing, lead, seller, search or map business row may be modified for this proof.

## Preconditions

HA-04 must not execute until all are true:

1. HA-01 source recovery is green.
2. The PG17 migration validation suite is green.
3. HA-03 baseline parity has passed for the approved business-table set.
4. The canary migration exists on both Supabase and Neon with matching schema.
5. Forward logical replication is configured and caught up.
6. The canary is carried by the same replication mechanism used for the HA data plane, or any dedicated canary transport is explicitly classified as transport-only evidence.
7. Direct/unpooled operator connections are available through approved secret stores.
8. An explicit production DB mutation approval has been recorded for the rehearsal.
9. A unique rehearsal `probe_run_id` has been generated.
10. The initial HA evidence bundle is created with phase `FORWARD_SYNC`.

If any precondition is missing, result = `BLOCKED`.

## Isolation

The canary must remain isolated from application behavior:

- no UI route;
- no API route;
- no search result;
- no business FK;
- no Auth/Storage dependency;
- no application service-role access;
- no scheduled job writes.

Operator writes use an approved direct PostgreSQL connection only.

## Required evidence before first mutation

Record:

- application commit;
- source schema fingerprint;
- target schema fingerprint;
- publication name;
- subscription name;
- source current WAL LSN;
- replication slot status;
- subscriber status;
- current replication lag;
- exact canary row count on source and target;
- HA state = `SUPABASE_PRIMARY`;
- Supabase proven as the only application writer.

## Test vector

Use one unique `probe_run_id`.

### HA04-T01 — INSERT

Source operation concept:

- insert one canary row;
- payload = deterministic rehearsal token;
- version = 1;
- explicit `updated_at = now()`.

Capture immediately after commit:

- source commit timestamp;
- source WAL LSN after commit;
- canary UUID.

Target observation:

- poll only within the controlled rehearsal process;
- record first timestamp when the exact UUID/version/payload appears;
- record subscriber/replay position.

PASS:

- row appears exactly once;
- payload/version match;
- lag is measurable;
- no duplicate row;
- no business table mutation.

### HA04-T02 — UPDATE

Source operation concept:

- same canary UUID;
- set deterministic payload v2;
- version = 2;
- explicitly update `updated_at`.

Capture:

- source update timestamp;
- source WAL LSN after commit.

Target observation:

- same UUID reaches version 2 exactly once;
- content matches;
- measured lag recorded.

PASS:

- no additional row;
- exact version/payload parity;
- target reaches v2 within measured RPO window.

### HA04-T03 — DELETE

Source operation concept:

- delete exactly the rehearsal canary UUID.

Capture:

- source delete timestamp;
- source WAL LSN after commit.

Target observation:

- row no longer exists on target;
- replay position reaches/passes the delete boundary.

PASS:

- source count for the probe_run_id = 0;
- target count for the probe_run_id = 0;
- no duplicate/tombstone representation remains;
- measured delete lag recorded.

## Lag calculation

For each mutation:

```text
visibility_lag =
  target_first_verified_state_timestamp
  - source_commit_timestamp
```

Where available, also record WAL evidence:

- source commit/flush LSN;
- slot confirmed/restart LSN;
- subscriber received/replayed LSN.

Wall-clock lag without LSN evidence is useful but insufficient for final HA certification.

## RPO measurement

For HA-04 the observed forward-sync RPO proxy is the worst successful mutation visibility lag:

```text
observed_forward_sync_rpo_proxy =
  max(insert_lag, update_lag, delete_lag)
```

Initial engineering target:

`<= 60 seconds`

This is not the final incident RPO. Final RPO is measured during failover rehearsal.

## Business-table publication membership

A canary transport success does not prove that all business tables are actually in the intended publication.

HA-04 must separately inspect and store publication membership for every approved HA business table.

PASS requires:

- expected table set present;
- no missing approved table;
- no unexpected table silently treated as HA-certified.

## Replication interruption subtest

At least one rehearsal must include a controlled replication-worker interruption that does not change application writers.

Goal:

- prove the subscriber catches up after restart;
- no canary mutation is lost or duplicated;
- final source/target canary state matches.

This test must not be performed by destroying slots/publications in production.

Use only a tested, reversible pause/restart mechanism.

## Cleanup

After evidence is captured:

1. confirm source and target final state for the rehearsal UUID;
2. ensure the DELETE has propagated;
3. verify zero remaining canary rows for `probe_run_id`;
4. retain only the evidence artifact, not test rows.

Cleanup failure = `FAIL`.

## Evidence artifact

Populate phase:

`FORWARD_SYNC`

Required fields include:

- `forward_start_lsn`;
- `forward_end_lsn`;
- `observed_rpo_seconds`;
- single-writer proof;
- conflicts = 0;
- duplicates = 0;
- canary table parity;
- publication membership snapshot;
- source/target schema fingerprints.

The canary evidence supplements business-table baseline evidence. It does not replace HA-03.

## PASS criteria

Functional PASS:

- INSERT replicated exactly once;
- UPDATE replicated exactly once;
- DELETE replicated exactly once;
- final canary source/target state equal;
- no conflict;
- no duplicate;
- no business mutation;
- publication membership correct;
- single-writer invariant preserved;
- forward LSN evidence complete.

Performance target PASS:

- worst observed mutation visibility lag <= 60 seconds.

If functional checks pass but target is missed:

`FUNCTIONAL_PASS / PERFORMANCE_NOT_CERTIFIED`

Do not rewrite this as full HA PASS.

## BLOCKED conditions

- Supabase SQL unavailable;
- baseline parity unavailable;
- canary schema missing/mismatched;
- publication/subscription not ready;
- required direct connection secret unavailable;
- production DB mutation approval absent;
- LSN boundary cannot be observed.

## FAIL conditions

- duplicate canary row;
- content mismatch;
- delete does not propagate;
- business table changed;
- split-brain evidence;
- unexpected publication membership;
- cleanup leaves rehearsal rows;
- replication resumes with data loss;
- conflicts > 0.

## Human gate

Creating the migration file in Git does **not** authorize applying it.

Creating this rehearsal contract does **not** authorize INSERT/UPDATE/DELETE against production databases.

Before HA-04 mutation execution, explicit approval is required for:

- applying the canary schema to production Supabase/Neon;
- running the rehearsal mutations.

## Current state

As of 2026-09-24:

- Supabase remains in recovery with `57P03 / Hot standby mode is disabled`;
- canary migration exists only in the draft HA/DR branch;
- no canary table has been applied;
- no rehearsal mutation has been executed.
