# AkarFinder — Transactional Recrawl Activation V1

## Verdict

`CERTIFIED_WITH_REAL_SUPABASE_PROOF`

## Purpose

Atomically connect one authorized factual recrawl observation to the append-only observation stream, derived ledger events, freshness/lifecycle signals, recrawl attempts and adaptive rescheduling.

## Atomic contract

The RPC `commit_transactional_recrawl_observation_v1` performs, in one PostgreSQL transaction:

1. validates and locks the active recrawl lease;
2. inserts or reuses the idempotent factual observation;
3. derives reproducible Observation Ledger events;
4. persists the freshness/lifecycle signal;
5. records the recrawl attempt;
6. releases the lease and writes the next recrawl date.

Any exception rolls the whole sequence back.

## Security and no-bypass invariants

- `SECURITY INVOKER`;
- execute permission restricted to `service_role`;
- explicit `public, extensions, pg_temp` search path;
- matching source, worker and lease token required;
- lease must remain valid beyond `completed_at`;
- publication remains false in observation-adjacent outputs;
- no SERP activation;
- no proxy, CAPTCHA, login, stealth or collection-policy bypass.

## Real controlled proof

Project: canonical Supabase project `kusfiyimwvxblvsrhaes`.

Source offer: `2571`, Mubawab, Ben Guerir.

Factual input already present in AkarFinder:

- HTTP status: `200`;
- displayed price: `1000 MAD`;
- surface: `3200 m²`;
- status: `active`;
- content fingerprint: `3e8be1fce986a3d843e18b4f47e3941e024fdb2382e059e64f20f68de6e7f79b`.

Committed outputs:

- observation: `9bdcc7d6-45cc-4874-abf0-8ea9835b4198`;
- ledger event: `first_observed`;
- event key: `b57476d025dfeaf72c58ce00f214df177a1b2568a42c232138ba0d7cdb04f1ce`;
- lifecycle signal: `a7852782-9d9a-4bd1-837d-9dc565d60c6f`;
- lifecycle state: `newly_observed`;
- freshness score: `100`;
- attempt: `750772cc-4f53-44b5-869a-61487ebc6b67`;
- next recrawl: `2026-07-27T23:47:38.18692Z`;
- publication eligible: `false`.

## Idempotence proof

The same source snapshot and attempt key were replayed under a new valid lease.

Results:

- same observation ID;
- same attempt ID;
- same lifecycle signal ID;
- `observation_inserted=false`;
- no new ledger event;
- one row remained in each proof table.

## Rollback proof

A valid lease was claimed and then deliberately expired before commit. The active-lease trigger rejected the attempt with `recrawl lease expired`.

Counts before and after remained:

- observations: `1`;
- ledger events: `1`;
- lifecycle signals: `1`;
- attempts: `1`.

The expired lease was released after verification.

## Incidents found and fixed

1. `pgcrypto.digest` was installed in Supabase's `extensions` schema. The RPC search path now resolves it explicitly.
2. Composite-returning helper functions required direct PL/pgSQL row assignment. Ledger-event and attempt assignments were corrected.
3. Lease token/worker validation alone did not reject an expired lease. A fail-closed trigger now validates `lease_until > completed_at`.

All failed canary attempts rolled back atomically and left no partial observations, ledger events, lifecycle signals or attempts.

## CI

Final certified head: `f1418b67657f9ca1b5cbe2d6d633da5f78bfb656`.

Workflow `Transactional Recrawl Activation V1 Gate`, run #8:

- transactional SQL contract tests: success;
- migration contract assertions: success;
- lease-expiry guard: success;
- pgcrypto schema resolution: success;
- composite assignment guard: success;
- TypeScript: success;
- Production build: success.

## Deliberate boundary

This LOT activates one internal transactional observation loop. It does not enable public search publication or autonomous mass recrawling. Broader source rollout requires a separate budgeted activation LOT.
