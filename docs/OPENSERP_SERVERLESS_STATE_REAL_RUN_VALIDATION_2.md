# OPENSERP-SERVERLESS-STATE-REAL-RUN-VALIDATION-2

Status: **STOP -- REAL_RUN_V2_BLOCKED_REQUIRES_CODE_CHANGE**

## What succeeded

- GitHub Actions `schedule` trigger made **actually absent** on `origin/main` (commit `b01502e`), verified both via `git show` (file content) and via GitHub's own run history (0 scheduled runs since the fix landed, despite ~3h elapsed and a previously roughly-hourly firing pattern). `workflow_dispatch` confirmed still functional (run #9, NOOP, Success).
- `openserp_ingestion_run_lock` migration applied to Production Supabase: table + 2 atomic functions, RLS enabled, 0 policies, verified via a live acquire/refuse/release smoke test directly against Production.
- Time-budget/lease code deployed to Production with flags off; authenticated NOOP proven clean (all 9 counters, including the new lock table, unchanged).
- User's explicit "OUI" authorization obtained via the exact verbatim gate question, plus a second explicit re-confirmation on the `OPENSERP_INGESTION_CRON_ENABLED` naming point.
- **The lease-based lock's core promise was validated under real failure conditions**: run 1's invocation acquired the lock, was killed by the platform, never reached its own `finally` release -- and the lease **self-expired and cleared with zero manual intervention**, unlike the old lock which required a manual `DELETE` after the original incident.
- All business data proven untouched by run 1 (558/563/419/419/7564/0, byte-for-byte identical before/after).

## What failed

Run 1 (`workflow_dispatch`, run #10, commit `b01502e`) returned **HTTP 504**. Vercel's own function logs confirm:

```
Vercel Runtime Timeout Error: Task timed out after 120 seconds
```

Exactly the platform's hard limit, not the internal ~100s budget deadline -- and only one log line exists for the entire invocation, meaning the function never reached a point where it could log progress or return a response. Zero rotation-state checkpoints were persisted, meaning it died before completing even the first query.

## Root cause (confirmed, not yet fixed)

`OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1` added bounded, AbortController-based timeouts to the **external engine calls** (`openserp-live.ts`) and a JS-side elapsed-time budget checked *between* awaited calls in the orchestrator's query loop. It did **not** add any timeout to the **Supabase/DB calls** themselves -- `hydrateRotationQueries`'s single `SELECT ... WHERE query_id IN (...)` with all 2718 query_ids, `loadBudgetState`, `persistRotationUpdates`, `persistBudgetState` all use the plain `@supabase/supabase-js` client with no request-level timeout. A JS-side "check elapsed time before the next unit of work" check does nothing to bound how long any single `await` on one of these calls is allowed to take -- if that call hangs or is simply very slow under real conditions (cold start, real network latency, a 2718-value filter), the function has no way to self-interrupt and rides out to the platform's kill.

This exact condition was never exercised by this mission's own test suite, which validated the query loop's time-budget behavior using a small, already-seeded fixture universe (4-8 queries) against a mocked, instant-responding DB client (PGlite) -- never the full 2718-query production universe under real Supabase/network latency.

## What did not happen

- Run 2: not authorized (ODM requires run 1 to be strictly PASS).
- Any code fix: not attempted under this authorization, per the mission's own "no patch-and-continue" rule.
- Any deployment beyond the flag revert: the revert redeploy (`dpl_FN24LjSMyTaZGfFMCjSBhyc7cbHS`) is the final state; flags confirmed `false`, endpoint confirmed `401` without a secret, 6 spot-checked public routes confirmed healthy.

## Recommended next mission

A narrowly-scoped mission (suggested name: `OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1`) to:
1. Add explicit timeout protection to every Supabase call in the ingestion path (not just external engine calls) -- e.g. an `AbortSignal.timeout()` passed through `postgrest-js`'s request options, or a wrapping `Promise.race` with a hard deadline.
2. Consider narrowing `hydrateRotationQueries`'s query to just the queries likely to be selected (e.g. chunk the IN clause, or pre-filter by `next_eligible_at`/`last_executed_at is null` at the SQL level) rather than always hydrating the full 2718-row universe on every invocation.
3. Extend the time budget model so the setup phase itself has a bounded allowance, with a clean early-return (still HTTP 200, `outcome_status: "setup_time_budget_exhausted"` or similar) if it can't complete in time -- rather than relying solely on per-query-loop checks that are never reached if setup itself hangs.
4. Re-validate locally against realistic DB latency (e.g. an artificial delay injected into the PGlite/mock client) before attempting `OPENSERP-SERVERLESS-STATE-REAL-RUN-VALIDATION-3`.

Full data: `data/audits/openserp-real-run-v2-*.json`.
