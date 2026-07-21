# OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1

Status: **complete**, all gates (A-F) passed. No real run, no flag activation, no Production deployment, no Production DB modification (beyond the one explicitly-authorized targeted lock-row cleanup) occurred under this mission.

## 1. Context / incident recap

The first real-run validation attempt (`OPENSERP-SERVERLESS-STATE-REAL-RUN-VALIDATION-1`) failed: GitHub Actions run #6 triggered the cron endpoint with all write flags on, and Vercel killed the function with `504 FUNCTION_INVOCATION_TIMEOUT` after the batch of 12 real queries exceeded the route's `maxDuration=120s`. Because the platform kill happens outside JavaScript's control, the route's `finally` block (which released the run-lock) never ran, leaving an orphaned lock sentinel in `discovery_candidates`. Full incident record: `data/audits/openserp-serverless-state-real-run-attempt-result.json`.

## 2. Time budget model

`lib/openserp-ingestion/time-budget.ts` — a pure, injectable-clock module.

- `createTimeBudget({ routeMaxDurationMs, safetyMarginMs, now })` computes an absolute `deadlineMs = startedAtMs + (routeMaxDurationMs - safetyMarginMs)`.
- `remainingBudgetMs` / `isTimeBudgetExhausted` / `elapsedMs` / `snapshotTimeBudget` read against that deadline via an injected `now()` (defaults to `Date.now`), so tests never wait in real time.
- The orchestrator (`run-orchestrator.ts`) checks the remaining budget **once at the top of every batch-loop iteration**, before starting a new query, using a single unified threshold (see below) rather than two inconsistent checks — an earlier draft had the outer loop check only `isTimeBudgetExhausted` (remaining ≤ 0) while the inner per-engine-call check used a stricter floor, which let the loop silently "burn through" the rest of a batch doing zero real work once budget dropped below the floor but stayed above zero. Fixed before this mission's own tests were written to lock the correct behavior in.

## 3. Safety margin

`DEFAULT_SAFETY_MARGIN_MS = 20_000` (20s), a single named constant in `time-budget.ts`. Route-level usable window at the current `maxDuration=120s`: **100s**. Configurable per-call via `runIngestionCycle`'s `safetyMarginMs` input (used by tests to exercise tight budgets without waiting).

## 4. Per-engine call timeout

`DEFAULT_ENGINE_CALL_TIMEOUT_MS = 15_000` (15s) in `lib/openserp-ingestion/openserp-live.ts`. The orchestrator computes an actual per-call timeout as `min(engineCallTimeoutMs, remainingBudgetMs - 500ms)`, floored at 1000ms — a call is never handed more time than the invocation could possibly honor, and a slow engine's own timeout automatically shrinks as the run progresses. Below `MIN_VIABLE_CALL_BUDGET_MS = 3000ms` remaining, no further call is attempted at all (see §2). Outcomes are classified into exactly 4 categories via `EngineCallError.outcome`: `engine_timeout`, `network_error`, `invalid_response`, plus implicit `success`. Both the HTTP path (`AbortController`) and the CLI path (`execFile`'s own `timeout` + killed-signal detection) are covered.

## 5. Serverless batch-size cap

`MAX_SERVERLESS_BATCH_SIZE = 5` in `lib/openserp-ingestion/budget-policy.ts` — a hard ceiling independent of the adaptive `current_budget` (which can climb to 24). Only applied when the caller does **not** pass `batchSizeOverride` (i.e. the real cron/dispatch path); the CLI bootstrap script's intentionally larger 25/100/300-query waves are unaffected. `RunMetrics` now reports `planned_unit_count` vs `executed_unit_count` explicitly so a capped or partial run is always visible, never silently smaller than expected.

## 6. Checkpoint strategy

Atomicity unit: **one query**. `run-orchestrator.ts` calls `persistRotationUpdates([updatedQuery], ...)` immediately after each query finishes (success or failure), not once after the whole batch. `upsertQueryStates` is a plain Postgres upsert keyed by `query_id`, so a retried/duplicate persist of an already-correct row is idempotent by construction — verified by the "retry the same runId" test (0 duplicate rows, 8 total regardless of how many times persisted). Engine budget state is persisted once per invocation (cheap, 3 rows) but **unconditionally**, including on an early/partial exit, so any incident signal observed on the units that did run is never lost.

## 7. Lock lease and recovery model

`supabase/migrations/20260718180000_create_openserp_ingestion_run_lock.sql` replaces the old `discovery_candidates`-sentinel, read-then-write compare-and-set lock with a dedicated `openserp_ingestion_run_lock` table (`lock_name` PK, `owner_id`, `acquired_at`, `expires_at`) plus two atomic Postgres functions:

- `acquire_openserp_ingestion_lock(lock_name, owner_id, lease_seconds)` — a single `INSERT ... ON CONFLICT (lock_name) DO UPDATE ... WHERE expires_at < now()` statement. Whether *this* call's attempt took effect is read via `GET DIAGNOSTICS row_count`, not a second read (which would itself be a race). Two concurrent callers can never both believe they hold the lock.
- `release_openserp_ingestion_lock(lock_name, owner_id)` — `DELETE ... WHERE lock_name = ... AND owner_id = ...`; only the current owner can release.

`app/api/internal/cron/openserp-ingestion/route.ts` acquires with `LOCK_LEASE_SECONDS = maxDuration + 30s`, comfortably outliving any legitimate invocation, and releases in `finally` as before — but now, if the platform kills the function before `finally` ever runs, the lease simply expires on its own and the next attempt takes over atomically. **No manual cleanup is ever required again.**

## 8. Recovery procedure (for a human, if ever needed)

Under the new lock model, none should be needed. If a lock is somehow still visibly stuck longer than its lease: `select * from openserp_ingestion_run_lock;` to inspect, and note that any acquisition attempt after `expires_at` passes will automatically reclaim it — no manual `DELETE` is the supported path anymore (unlike the pre-mission incident, which required exactly that).

## 9. GitHub Actions schedule state

`.github/workflows/openserp-ingestion-cron.yml`'s `schedule: cron: "*/30 * * * *"` trigger was found live on the default branch (contributed to the original incident) and has been **removed**, deliberately, pending a future explicit re-authorization. `workflow_dispatch` remains available for controlled manual runs. Guarded by `scripts/scrapers/__tests__/openserp-schedule-trigger-guard.test.ts` (static, part of `test:scrapers`).

## 10. Bounded concurrency (Phase 8) — decision: not introduced

Evaluated and deliberately **not added**. The combination of a small batch cap (5), bounded per-engine timeouts, and a per-query time-budget check already keeps a real invocation well inside its usable window under normal network conditions; concurrency would add real risk (parallel DB checkpoint writes, parallel engines each independently misjudging remaining budget) without being necessary, matching the ODM's own "n'est pas obligatoire si les petits lots et les timeouts suffisent."

## 11. Preconditions for the next mission (`OPENSERP-SERVERLESS-STATE-REAL-RUN-VALIDATION-2`)

- Flags remain `false`/`false`/`false` in Production (confirmed unchanged by this mission — no flag was ever set).
- The new lock migration (`20260718180000_...`) is **not yet applied to Production Supabase** — this mission is code+tests+local-PGlite-validation only, matching its own gates. Applying it is a prerequisite for the next mission, likely via the same single-paste Supabase SQL Editor mechanism used for the state-persistence migration.
- The code (this branch's HEAD) is **not yet deployed to Production** — a prerequisite deploy step, mirroring `OPENSERP-SERVERLESS-STATE-PROD-DEPLOY-FLAGS-OFF-1`'s own precheck/deploy/validate structure, is expected before any real run.
- The next mission's own explicit authorization is required before any flag activation, deployment, or real write.

## 12. Files modified/added

See the result report (`data/audits/openserp-serverless-time-budget-and-lock-safety-result.json`) for the exhaustive list with a one-line purpose per file.
