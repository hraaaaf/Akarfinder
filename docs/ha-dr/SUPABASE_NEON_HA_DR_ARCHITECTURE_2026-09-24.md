# AkarFinder — Supabase ↔ Neon HA/DR Architecture v0

Date: 2026-09-24  
Status: DESIGN / NOT PRODUCTION-ACTIVE  
Repository: `hraaaaf/Akarfinder`  
Base branch: `infra/neon-migration-20260923`  
HA/DR branch: `infra/supabase-neon-ha-dr-20260924`

## Goal

Guarantee PostgreSQL data-plane continuity with:

- Supabase as the normal primary writer.
- Neon as an independently queryable standby.
- Exactly one application writer at any time.
- Controlled failover to Neon during a Supabase outage.
- Controlled reverse-delta synchronization before any failback to Supabase.
- No production cutover or Vercel deployment as part of this design lot.

## Success criteria

This architecture is not certified until all of the following are demonstrated:

1. Supabase → Neon baseline parity.
2. Continuous insert/update/delete replication with measured lag.
3. Failover simulation where Supabase is unavailable and Neon serves reads/writes.
4. Proof that application writes cannot reach both databases simultaneously.
5. Reverse delta Neon → Supabase after the incident.
6. No duplicate replay / replication loop.
7. Sequence state is correct after failback.
8. Schema drift blocks failback until reconciled.
9. Counts + primary-key sets + timestamps/versions + deterministic digests match.
10. Operator runbook and kill switch are tested.

## Current verified state

### Supabase

Project: `AqarFinder` / `kusfiyimwvxblvsrhaes`.

The operator has intentionally paused Supabase pending a restore.

Therefore:

- no SQL probe is authorized until the operator explicitly signals restore complete;
- HA-01 remains blocked in `OPERATOR PAUSED / RESTORE PENDING`;
- the previous `57P03 / Hot standby mode is disabled` result is historical context only;
- no baseline export or replication setup can be certified yet.

### Migration PR

PR #1082 remains open, draft, and mergeable.

The HA/DR work must not merge or deploy #1082 until the existing PG17/source validation gates are green.

### Neon

Known target metadata from the previous migration work:

- Project: `ancient-violet-43534870`
- Branch: `br-frosty-glitter-b2762sv1`
- Database: `AkarFinder`

The current Neon connector has a project-scoping defect: underlying calls require `project_id` while the exposed wrapper does not accept/provide it for several actions. No fresh Neon runtime state is claimed from this window.

## Primary-source feasibility

The following current official documentation establishes the feasible primitives:

### Supabase as publisher

Supabase documents logical replication from Supabase to another PostgreSQL database:

- https://supabase.com/docs/guides/database/postgres/setup-replication-external

Key constraints:

- use a direct PostgreSQL connection, not a pooled one;
- publication + replication slot are required;
- replication-slot WAL retention must be monitored.

### Supabase as subscriber

Supabase also documents migration from an external PostgreSQL source using logical replication, which proves Supabase can act as a subscriber:

- https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres

This makes a controlled Neon → Supabase reverse-delta path technically possible.

### Neon as subscriber

Neon explicitly documents logical replication for Supabase → Neon migration:

- https://neon.com/docs/guides/logical-replication-supabase-to-neon
- https://neon.com/docs/import/migrate-intro

Neon also documents that pooled connections are not appropriate for logical replication:

- https://neon.com/docs/get-started/production-checklist

### PostgreSQL 17 constraints

PostgreSQL logical replication documentation:

- https://www.postgresql.org/docs/17/logical-replication.html
- https://www.postgresql.org/docs/17/logical-replication-restrictions.html
- https://www.postgresql.org/docs/17/sql-createsubscription.html
- https://www.postgresql.org/docs/17/protocol-logical-replication.html

Important consequences:

- DDL/schema changes are not automatically replicated.
- Sequence state is not automatically replicated.
- Replica identity must support UPDATE/DELETE for the replicated tables.
- A subscriber may also be a publisher.
- PostgreSQL 17 supports replication-origin filtering; `origin = none` can exclude changes that themselves arrived through logical replication and is relevant to loop prevention.

## Architecture decision v0

### Rejected

Do **not** implement:

- active-active dual writes;
- uncontrolled bidirectional replication;
- automatic failback based only on a provider "healthy" flag;
- application-level writes to both Supabase and Neon;
- blind re-enabling of the old forward subscription after reverse synchronization.

These paths increase split-brain and replay risk without providing a benefit required by AkarFinder.

### Selected for validation

Use a **single-writer state machine** with PostgreSQL logical replication:

```text
NORMAL
  Supabase = writer
  Supabase  ──logical replication──>  Neon
                                      standby/read validation

INCIDENT
  Supabase writes = disabled
  forward sync = fenced
  Neon = sole writer

RECOVERY
  Neon = still sole writer
  Neon incident delta ──controlled logical replication──> Supabase
  parity + sequence + schema verification

FAILBACK
  brief write freeze
  final delta drain
  Supabase promoted to sole writer
  Neon re-established as standby only after no-loop proof
```

This is deliberately not an active-active topology.

## State machine

The application/operations layer must expose an explicit state, conceptually:

- `SUPABASE_PRIMARY`
- `FAILOVER_PREP`
- `NEON_PRIMARY`
- `FAILBACK_SYNC`
- `FAILBACK_FREEZE`

A transition must be transactional from the operator's perspective: the next writer is never enabled until the previous writer is fenced.

The concrete storage of this state is an implementation detail for a later lot; it must not depend solely on the database being failed over.


### Application write authority in the current branch

The current repository implementation uses an explicit application control variable:

- `HA_WRITER_STATE` — authoritative write state;
- `DATABASE_PROVIDER` — read-path/provider selection only.

Rules:

1. `DATABASE_PROVIDER` must never implicitly promote a writer.
2. If `HA_WRITER_STATE` is absent, the backward-compatible pre-activation default is `SUPABASE_PRIMARY`.
3. If an explicit `HA_WRITER_STATE` value is invalid, application write authorization fails closed.
4. `FAILOVER_PREP` and `FAILBACK_FREEZE` reject all PostgreSQL data-plane writes.
5. `NEON_PRIMARY` and `FAILBACK_SYNC` reject Supabase data-plane writes.
6. `SUPABASE_PRIMARY` rejects Neon data-plane writes.
7. Auth and Storage remain separate failure domains; the DB write fence must not globally disable those services.

Concrete guard:

`lib/db/ha-write-policy.ts`

Critical runtime Supabase mutation paths are being wired to `assertHaSupabaseWriteAllowed()` and protected by a repository-wide static mutation audit.

Important limitation:

The guard proves that known Supabase write paths can be fenced. It does **not** yet prove that every required business write has a working Neon implementation. Therefore `NEON_PRIMARY` is not production-certifiable merely because Supabase writes are blocked.

## NORMAL — Supabase → Neon

### Writer rule

Only Supabase accepts application writes.

### Replication

Recommended primitive:

- Supabase publication for the approved HA table allowlist.
- Direct/unpooled Supabase replication connection.
- Neon subscription.
- Continuous monitoring of:
  - replication slot activity;
  - retained WAL;
  - last replayed LSN / subscriber state;
  - replication lag.

### Initial engineering target

These are design targets, not an SLA:

- RPO target: **≤ 60 seconds** during normal operation.
- RTO target for manual database failover: **≤ 15 minutes**.

They must be replaced by measured values after HA-04/HA-05 tests.

## INCIDENT — promotion to Neon

Failover must be a guarded operation.

### Promotion gates

Before Neon may accept the first incident write:

1. Confirm the Supabase failure condition crosses the documented failover threshold.
2. Fence application writes to Supabase.
3. Record the last known forward replication position and lag.
4. Disable or otherwise fence the forward Supabase → Neon apply path.
5. Verify Neon has the expected schema version.
6. Establish a reliable capture point for the future Neon incident delta **before** accepting new writes.
7. Change the application DB-provider state to Neon.
8. Verify Supabase remains non-writable from the application path.
9. Only then allow Neon writes.

### Why the delta capture point is mandatory

If Neon starts accepting incident writes before a reverse-sync start point exists, determining exactly which rows belong to the incident window becomes less reliable.

The preferred implementation is a Neon publication/logical slot prepared for the incident window. If exact pre-promotion slot behavior cannot be guaranteed with the target provider privileges, use an explicit application change journal for the HA allowlist instead.

No implementation choice is certified until tested.

## RECOVERY — Neon → Supabase

When Supabase accepts connections again, do **not** immediately send application traffic back.

### Recovery steps

1. Keep Neon as the sole writer.
2. Verify Supabase health with SQL, not only control-plane status.
3. Reconcile schema/DDL on Supabase before applying data delta.
4. Create/enable a Supabase subscription for the Neon incident publication.
5. Use `copy_data = false` for reverse delta if the baseline is already present and the captured start point is proven.
6. Prefer `origin = none` where supported by the exact provider/version combination so replicated changes that originated on Supabase and were replayed into Neon are not sent back as local Neon changes.
7. Monitor until the reverse delta reaches the captured target LSN.
8. Reconcile sequence state separately.
9. Run parity checks.
10. Enter a short final write freeze on Neon.
11. Drain the last delta.
12. Re-run parity.
13. Only then promote Supabase back to writer.

## Loop-prevention rule

The most dangerous failure mode is:

```text
Supabase original write
  → replicated to Neon
  → reverse-replicated to Supabase
  → forward-replicated to Neon again
  → conflict / duplicate / loop
```

The design therefore requires a dedicated test for PostgreSQL replication origins on the exact Supabase/Neon versions.

### Preferred path

If exact tests prove it:

- forward subscription applies only original Supabase changes;
- reverse subscription uses `origin = none` so only local Neon incident writes are returned.

### Fail-safe path

If no-loop behavior cannot be proven:

1. complete reverse delta;
2. certify Supabase parity;
3. discard/rebuild the Neon standby from the now-authoritative Supabase primary;
4. establish a fresh forward subscription.

This rebaseline is slower but safer than an unproven bidirectional topology.

## Repository evidence and live capability probe

The existing migration work already separates the database portability closures:

- core listings / Market Index;
- ODM public search;
- owner-read relational closure;
- ANN-L8/L9 comparables/history;
- Map Market Intelligence.

This is useful scope evidence, but it does **not** prove live replication readiness.

In particular, the repository alone does not prove the current production values for:

- `wal_level`;
- replication-role capability;
- slot/sender limits;
- table `REPLICA IDENTITY`;
- exact primary keys;
- identity/sequence-backed columns;
- existing replication slots/subscriptions.

A read-only inventory is therefore prepared at:

`scripts/ha-dr/logical-replication-capability-inventory.sql`

Properties:

- starts `BEGIN TRANSACTION READ ONLY`;
- performs no DDL or DML;
- covers all 16 current candidate HA tables;
- inspects PostgreSQL replication settings and current-user replication capability;
- inventories replica identity and primary keys;
- inventories sequence/identity-backed columns and public sequences;
- inventories existing replication slots and subscriptions.

Static guard:

`scripts/scrapers/__tests__/ha-replication-capability-inventory.test.ts`

Isolated local proof on 2026-09-24: **4/4 PASS**.

This probe must be run on the actual Supabase and Neon databases before HA-02 is certified. Until then, sequence/replica-identity readiness remains explicitly **unproven**.

## DDL strategy

Logical replication does not replicate DDL.

Therefore:

- schema migrations remain Git/repo driven;
- the exact schema version must be recorded at failover;
- no failback is allowed with unresolved schema drift;
- schema compatibility is a hard gate, not a warning.

A future implementation should add a deterministic schema fingerprint for the HA table set.

## Sequence / identity strategy

Logical replication does not synchronize sequence state.

For UUID primary keys, no sequence repair is required.

For sequence-backed identifiers:

1. inventory every sequence used by an HA table;
2. after reverse delta and before Supabase promotion, set each destination sequence to a value strictly compatible with the replicated maximum;
3. test the next generated ID for collision-free behavior;
4. include sequence state in the failback evidence.

Do not assume all AkarFinder identifiers are UUID until the live schema inventory proves it.

## DELETE / UPDATE prerequisites

Every replicated table that can receive UPDATE or DELETE must have a valid replica identity.

HA-03 must inventory:

- primary key;
- replica identity;
- generated/default columns;
- triggers;
- foreign keys;
- sequence dependencies;
- RLS/policies where relevant.

A table that cannot safely reproduce UPDATE/DELETE is not allowed into the HA set yet.

## Initial HA table candidates

Start from the migration inventory, but certify the actual live dependency closure before enabling replication.

### Core

- `property_listings`
- `listing_sources`
- `property_clusters`
- `property_cluster_members`

### Public search / ODM

- `thin_index_search_documents`
- `source_policy_registry`
- `professional_listing_ownership`
- `search_business_entitlements`

### Owner/read

- `buyer_leads`
- `seller_property_drafts`
- `seller_listing_publications`
- `owner_listing_representations`

### Comparables/history/map

- `source_offer_observations`
- `geo_entities`
- `geo_resolution_events`
- `source_offer_seeds`

This list is a candidate set, not a certified exhaustive inventory.

## Auth and Storage boundary

This architecture covers the PostgreSQL data plane.

It does **not** make these services highly available:

- Supabase Auth
- Supabase Storage/media

They require separate HA/DR plans. A database failover must not be described as a full-platform failover until these dependencies are separately handled and tested.

## Secrets

Allowed references in code/docs:

- `SUPABASE_DATABASE_URL_DIRECT`
- `NEON_DATABASE_URL_DIRECT`
- `NEON_DATABASE_URL`
- `SEARCH_CURSOR_SECRET`

Never commit or print secret values.

Logical replication and dump/restore operations must use direct/unpooled connections where required.

## Test matrix

| ID | Test | Required proof |
|---|---|---|
| HA-T01 | Baseline import | count + PK set + deterministic digest parity |
| HA-T02 | Normal INSERT | row appears on Neon within RPO |
| HA-T03 | Normal UPDATE | changed content appears once on Neon |
| HA-T04 | Normal DELETE | deletion reproduced on Neon |
| HA-T05 | Forward link interruption | subscriber catches up without data loss |
| HA-T06 | Supabase outage before sync | documented stale-data decision, no hidden write |
| HA-T07 | Promote Neon | Supabase app writes fenced before first Neon write |
| HA-T08 | Incident INSERT/UPDATE/DELETE | captured as Neon-local incident delta |
| HA-T09 | Supabase recovery | source healthy by SQL but still not writer |
| HA-T10 | Reverse delta | only incident-origin changes applied |
| HA-T11 | Origin loop test | zero replay loop / duplicate conflict |
| HA-T12 | Sequence repair | next generated IDs collision-free |
| HA-T13 | Schema drift | failback blocked until schema reconciled |
| HA-T14 | Final write freeze/drain | final target LSN reached |
| HA-T15 | Final parity | counts + IDs + timestamps/version + digests |
| HA-T16 | Prolonged outage | WAL/slot/storage behavior remains bounded |
| HA-T17 | Restart replication worker | idempotent recovery |
| HA-T18 | Split-brain guard | second writer activation is rejected |

## Metrics to capture

For every simulation:

- outage detection timestamp;
- writer-fenced timestamp;
- promotion timestamp;
- last forward LSN;
- first Neon incident-write timestamp;
- reverse-sync start/end LSN;
- replication lag p50/p95/p99;
- data lost = 0/known amount;
- duplicate/conflict count;
- failover duration;
- failback duration;
- parity digest result.

The measured numbers, not the design targets, become the eventual RPO/RTO evidence.

## LOT mapping

### HA-01 — Source recovery + validation suite

Blocked until Supabase `SELECT 1` succeeds.

Then:

- ensure `SUPABASE_DATABASE_URL_DIRECT` exists in GitHub Actions without exposing its value;
- run `Neon Migration Validation Suite` once;
- require 5/5 PG17 validation jobs green or diagnose the first real failure.

### HA-02 — Architecture replication / DR

This document is the v0 design output.

Remaining proof before HA-02 can be certified:

- live capability inventory once Supabase is available;
- exact privileges/settings for logical replication on both providers;
- proof of origin filtering on exact target versions;
- inventory of DDL/sequences/replica identities;
- measured target confirmation for RPO/RTO.

### HA-03 — Baseline

No production activation.

### HA-04 — Continuous sync proof

Measure real lag and validate insert/update/delete.

### HA-05 — Failover simulation

No Vercel production deployment without explicit authorization.

### HA-06 — Reverse delta / failback

Test origin filtering, sequence repair, final freeze, parity, and rebaseline fallback.

### HA-07 — Runbook / guardrails

Document exact operator commands, state transitions, kill switch, monitoring, and rollback.

## Current blocker

`HA-01` is currently blocked by an intentional operator pause pending restore.

No source SQL polling is allowed until the operator explicitly signals restore complete.

## Next exact

While Supabase remains unavailable:

1. verify this HA-02 document on the HA branch;
2. add implementation-neutral guard tests/specs for the single-writer state machine only if they can be written without touching production;
3. keep #1082 unmerged;
4. perform no Vercel deployment;
5. on the next justified source-health checkpoint, run one `SELECT 1`; if green, resume HA-01 immediately.
