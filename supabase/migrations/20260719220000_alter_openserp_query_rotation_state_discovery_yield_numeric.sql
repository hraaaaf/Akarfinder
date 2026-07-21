-- OPENSERP-QUERY-ROTATION-DISCOVERY-YIELD-NUMERIC-1
-- Objective: discovery_yield is a documented exponential moving average
--   (docs/OPENSERP_QUERY_COVERAGE_STRATEGY.md: "Learned discovery_yield
--   (exponential moving average of accepted-candidate count per query)"),
--   fractional by design since markQueryExecuted() in
--   lib/openserp-ingestion/query-rotation-planner.ts computes
--   round((previous*0.7 + acceptedCount*0.3) * 100) / 100. The original
--   migration (20260718140000_create_openserp_query_rotation_state.sql)
--   declared the column `integer`, a schema/code mismatch that crashed a
--   real write run (run_id openserp-github-cron-2026-07-19T21-07-04-086Z)
--   the first time a query's EMA produced a non-integer value (0.9). This
--   migration only widens the column's type to match the value it has
--   always been designed to hold. The EMA formula and
--   query-rotation-planner.ts are NOT changed by this migration.
-- Preconditions (verified read-only against Production before this
--   migration was authored): 2718 rows in openserp_query_rotation_state;
--   0 rows with discovery_yield < 0; 0 rows with discovery_yield != 0
--   (no successful write has ever persisted a non-zero value -- the crash
--   above was the first attempt). No index exists on discovery_yield
--   itself (only next_eligible_at and last_executed_at are indexed). No
--   other table references this column.
-- Impact: alters 1 column's type on 1 existing table. No other table
--   touched. No data loss: `USING discovery_yield::numeric(12,2)` is a
--   value-preserving widen -- every existing integer value (all 2718 rows
--   currently 0) casts exactly. Empirically verified (PGlite, a real
--   Postgres engine) that a bare ALTER COLUMN ... TYPE ... USING ...
--   automatically preserves NOT NULL, DEFAULT 0 (re-typed to numeric),
--   and the existing CHECK constraint
--   (openserp_query_rotation_state_yield_check, `discovery_yield >= 0`,
--   automatically re-typed to `discovery_yield >= (0)::numeric`) without
--   any separate SET DEFAULT / SET NOT NULL / constraint re-add -- so
--   none are repeated here.
-- Lock estimate: ALTER COLUMN TYPE rewrites the table -- brief ACCESS
--   EXCLUSIVE lock, negligible at 2718 rows on a small fixed-width column.
-- Re-run behavior: re-applying this exact ALTER on an already-numeric(12,2)
--   column is a no-op (empirically verified against PGlite) -- safe to
--   run twice.
-- Rollback: see bottom of file.

alter table openserp_query_rotation_state
  alter column discovery_yield type numeric(12,2)
  using discovery_yield::numeric(12,2);

-- ROLLBACK (manual, not auto-applied):
-- alter table openserp_query_rotation_state
--   alter column discovery_yield type integer
--   using round(discovery_yield)::integer;
