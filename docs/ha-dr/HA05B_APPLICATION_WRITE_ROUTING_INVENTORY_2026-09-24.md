# AkarFinder — HA05-B Application Write Routing Inventory

Date: 2026-09-24  
Status: ACTIVE / NOT PROVIDER-FAILOVER-READY

## Goal

Make the application write plane explicit before any live failover claim.

A write path is HA05-B provider-ready only if all are true:

1. it is fenced by the HA writer state;
2. it can execute against the authoritative provider selected by the HA state;
3. its target table/RPC exists and is proven compatible on that provider;
4. its write semantics have provider-specific tests;
5. no direct Supabase-only mutation remains in the promoted Neon write set.

## Current architecture

Read routing already supports `DATABASE_PROVIDER=supabase|neon` for selected read paths.

The runtime write plane does **not** currently have equivalent provider routing.

Current safety property:

- Supabase mutations are protected by `assertHaSupabaseWriteAllowed()`;
- `NEON_PRIMARY` and `FAILBACK_SYNC` therefore fail closed for these Supabase writes;
- this prevents split-brain;
- it does **not** make those writes succeed on Neon.

Therefore:

`HA05-B APPLICATION WRITE ROUTING = BLOCKED / NOT FAILOVER-READY`

until an approved runtime write set is implemented and proved on Neon.

## Current audited Supabase write surfaces

The runtime audit currently identifies these mutation-bearing files:

- `app/api/alerts/route.ts`
- `app/api/leads/[id]/route.ts`
- `app/api/visit-requests/route.ts`
- `lib/data-mass/trusted-seed-listing-materialization.ts`
- `lib/openserp-ingestion/national-writer.ts`
- `lib/openserp-ingestion/pipeline.ts`
- `lib/openserp-ingestion/state/engine-budget-state-repository.ts`
- `lib/openserp-ingestion/state/query-rotation-state-repository.ts`
- `lib/openserp-ingestion/state/ingestion-run-lock-repository.ts`
- `lib/professional/profile-service.ts`
- `lib/professional/identity-repository.ts`
- `lib/property-intelligence/store.ts`
- `lib/recrawl/connected-autonomous-microbatch.ts`
- `lib/serper-mass-harvest/runner.ts`
- `lib/user-continuity/service.ts`

Each current Supabase mutation surface must remain fenced. New mutation surfaces must be detected by CI and added to this inventory.

## Explicit non-writers

Do not classify generic method names as DB writes.

Examples already observed:

- `createHash(...).update(...)` is cryptographic hashing, not a DB mutation;
- search/get/read/list/find/fetch RPCs are treated as read-only by the runtime mutation audit unless separately proven mutating.

## HA05-B implementation gate

Before Neon can be promoted for application writes, define the **approved incident write set**.

For each approved write domain, choose one of:

### A. Provider-routed implementation

- central provider-aware writer adapter;
- `assertHaApplicationWriteTarget(...)` / provider-specific fence;
- equivalent Neon SQL/RPC semantics;
- exact table/schema compatibility;
- targeted unit + integration rehearsal.

### B. Explicitly disabled during incident

If a domain is not required during failover:

- keep it fail-closed in `NEON_PRIMARY`;
- document the degraded product behavior;
- ensure retries/queues cannot later replay unsafely;
- include it in operator runbook expectations.

No domain may silently fall back from Neon to Supabase.

## Human/live gates

Implementation can be prepared offline.

Provider readiness still requires:

- restored Supabase capability inventory;
- Neon capability proof;
- baseline/schema parity;
- exact provider mutation rehearsal;
- explicit production failover approval.

No Vercel production change or provider switch is authorized by this inventory.
