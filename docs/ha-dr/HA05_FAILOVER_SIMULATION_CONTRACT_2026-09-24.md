# AkarFinder — HA-05 Failover Simulation Contract

Date: 2026-09-24  
Status: DRAFT / NO PRODUCTION SWITCH AUTHORIZED  
Scope: controlled Supabase → Neon database failover rehearsal

## Goal

Prove that AkarFinder can move PostgreSQL read/write authority from Supabase to Neon without split-brain, while preserving an explicit rollback path.

This contract does not authorize a Vercel deployment or production provider switch.

## Simulation levels

### HA05-A — isolated rehearsal

Run first in a non-production environment against disposable or rehearsal database state.

Purpose:

- validate state-machine transitions;
- validate writer fencing;
- validate provider routing;
- validate failover timing instrumentation;
- validate rollback mechanics.

This is mandatory before any production rehearsal.

### HA05-B — production failover rehearsal

Allowed only after:

- HA05-A passes;
- HA-01, HA-03 and HA-04 are green;
- explicit human approval for production rehearsal;
- explicit human approval for any Vercel production deployment or environment switch.

## Preconditions

Production failover rehearsal is BLOCKED unless all are true:

1. Supabase source SQL is healthy before the planned test.
2. Forward replication is caught up and within target lag.
3. HA-03 baseline parity is current.
4. HA-04 INSERT/UPDATE/DELETE proof is green.
5. Incident-delta capture point can be established before Neon writes.
6. Single-writer state guard is active in the rehearsal control path.
7. Neon schema fingerprint matches the approved application/schema version.
8. Neon sequence/identity safety is proven for HA tables.
9. Reverse-delta recovery method has been rehearsed outside production.
10. Rollback owner/operator is identified.
11. Vercel deployment/switch authorization exists if required.

## State transitions

Only this path is permitted:

```text
SUPABASE_PRIMARY
  -> FAILOVER_PREP
  -> NEON_PRIMARY
```

Rollback before Neon promotion:

```text
FAILOVER_PREP
  -> SUPABASE_PRIMARY
```

Direct:

```text
SUPABASE_PRIMARY -> NEON_PRIMARY
```

is forbidden.

## HA05-T01 — establish failover decision

Record:

- failover decision timestamp;
- reason / simulated incident condition;
- exact application commit;
- schema fingerprint;
- forward replication lag;
- last forward LSN / target replay position;
- current writer = Supabase.

For a simulation, the incident condition must be controlled and reversible. Do not manufacture a destructive outage.

## HA05-T02 — enter FAILOVER_PREP

Actions conceptually required:

1. set HA control state = `FAILOVER_PREP`;
2. fence application writes to Supabase;
3. do not enable Neon writes yet;
4. verify both application writers are disabled;
5. record no-write-window start timestamp;
6. record final forward replication position;
7. establish incident-delta capture boundary on Neon.

PASS:

- Supabase write path fails closed;
- Neon write path still fails closed;
- reads may continue according to the rehearsal design;
- single-writer evaluator sees writer = none.

FAIL:

- either writer remains unexpectedly writable;
- incident boundary cannot be recorded.

## HA05-T03 — confirm Neon readiness

Before promotion verify:

- Neon SQL health;
- schema fingerprint;
- table allowlist;
- target replication state;
- replica identity;
- sequence/identity safety;
- canary parity;
- no unresolved lag beyond the accepted failover loss boundary.

If any check is uncertain: remain in `FAILOVER_PREP` or roll back.

## HA05-T04 — promote Neon

Only after HA05-T02/T03 pass:

1. enable Neon application writer;
2. set state = `NEON_PRIMARY`;
3. keep Supabase application writer fenced;
4. record promotion timestamp;
5. record no-write-window end timestamp.

Required proof:

- one and only one application writer = Neon;
- Supabase app write path remains disabled;
- Neon read smoke test passes;
- Neon canary write smoke test passes when mutation approval exists;
- no business data mutation is required for the smoke proof.

## HA05-T05 — measure failover RTO

```text
observed_failover_rto =
  timestamp(Neon verified service restoration)
  - timestamp(failover decision)
```

Also record:

```text
no_write_window =
  timestamp(Neon writer enabled)
  - timestamp(Supabase writer fenced)
```

Initial engineering target:

- failover RTO <= 15 minutes.

This is a target, not a pass override for integrity failures.

## HA05-T06 — verify incident write boundary

After Neon promotion:

- record first Neon-local incident write timestamp;
- record corresponding logical position / change boundary;
- prove it is distinguishable from forward-replicated Supabase-origin changes.

If the first incident write occurs before a deterministic capture boundary exists, the rehearsal FAILS.

## HA05-T07 — provider routing proof

In isolated rehearsal:

- exercise the exact provider-routing code path intended for production;
- verify reads use Neon;
- verify writes use Neon;
- verify Supabase writes are not attempted.

For production:

- no provider change may be deployed through Vercel without explicit authorization;
- an environment-variable change alone is still a production switch and requires the same gate.

## HA05-T08 — rollback before incident writes

A rehearsal must prove safe rollback from `FAILOVER_PREP` if Neon is not ready.

Steps:

1. verify Neon has not accepted incident writes;
2. re-enable Supabase writer;
3. set state = `SUPABASE_PRIMARY`;
4. verify Neon writer remains disabled.

PASS:

- no data reconciliation required;
- single-writer invariant preserved.

## HA05-T09 — rollback after Neon promotion

Once Neon has accepted incident writes, rollback is no longer a simple writer toggle.

Mandatory path:

- remain `NEON_PRIMARY`;
- execute HA-06 reverse-delta/failback process;
- never directly re-enable Supabase writer.

## Failure injection rules

Allowed first:

- controlled routing failure;
- controlled dependency-health failure;
- reversible connection blocking in an isolated environment;
- replication pause/restart previously proven safe.

Not allowed as a rehearsal shortcut:

- destructive database shutdown;
- slot destruction;
- publication deletion;
- data corruption;
- unbounded network blackhole in production;
- uncontrolled Vercel environment changes.

## Evidence artifact

Phase:

`FAILOVER`

Must include:

- `forward_end_lsn`;
- `incident_start_lsn`;
- observed RPO;
- observed failover RTO;
- failover decision timestamp;
- Neon service restoration timestamp;
- single-writer proof;
- conflicts = 0;
- duplicates = 0;
- schema fingerprint;
- table parity evidence carried from latest baseline.

## PASS

Functional PASS requires:

- legal state transitions only;
- Supabase fenced before Neon enablement;
- observable no-write window;
- deterministic incident boundary before first Neon write;
- one writer only;
- Neon service smoke proof;
- rollback path verified;
- zero conflict/duplicate.

Performance target PASS:

- observed failover RTO <= 15 minutes;
- observed incident RPO within the accepted target.

If integrity passes but performance misses:

`FUNCTIONAL_PASS / PERFORMANCE_NOT_CERTIFIED`

## BLOCKED

- baseline stale/missing;
- forward replication not caught up;
- sequence safety unknown;
- incident boundary unavailable;
- isolated rehearsal not passed;
- production mutation/deploy approval absent;
- Vercel authorization absent when a production switch is required.

## FAIL

- both writers writable;
- direct SUPABASE_PRIMARY → NEON_PRIMARY transition;
- first Neon incident write before boundary capture;
- Supabase writes observed after Neon promotion;
- schema mismatch;
- sequence collision risk;
- conflicts or duplicates;
- provider routing still attempts Supabase writes.

## Current state

As of 2026-09-24:

- no HA05-A or HA05-B rehearsal has run;
- no Vercel production deployment/switch is authorized by this document;
- Supabase remains unavailable for SQL;
- HA-05 execution is therefore BLOCKED.
