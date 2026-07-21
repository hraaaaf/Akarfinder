-- OPENSERP-SERVERLESS-STATE-PERSISTENCE-1
-- Objective: replace the local-filesystem rewrite of data/openserp/engine-budget-state.json
--   (same EROFS failure mode as the query rotation state) with a PostgreSQL table
--   holding per-engine budget/backoff state. Must survive across serverless function
--   invocations, redeploys, and separate GitHub Actions runners -- a local file or
--   in-memory value cannot.
-- Preconditions: none (fresh, additive table).
-- Impact: creates 1 new table + index. No existing table touched. No PII, no raw
--   SERP data, no listing URLs stored here.
-- Lock estimate: negligible (new empty table).
-- Re-run behavior: idempotent via IF NOT EXISTS.
-- Rollback: see bottom of file -- safe, this table starts empty.

create table if not exists openserp_engine_budget_state (
  engine                 text primary key,
  state_version           text not null,
  current_budget          integer not null,
  consecutive_failures    integer not null default 0,
  captcha_count           integer not null default 0,
  rate_limit_count        integer not null default 0,
  timeout_count           integer not null default 0,
  suspended_until         timestamptz,
  last_success_at         timestamptz,
  last_failure_at         timestamptz,
  last_run_id             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint openserp_engine_budget_state_engine_check check (engine in ('bing', 'duckduckgo', 'ecosia')),
  constraint openserp_engine_budget_state_budget_range_check check (current_budget between 4 and 24),
  constraint openserp_engine_budget_state_consecutive_failures_check check (consecutive_failures >= 0),
  constraint openserp_engine_budget_state_captcha_count_check check (captcha_count >= 0),
  constraint openserp_engine_budget_state_rate_limit_count_check check (rate_limit_count >= 0),
  constraint openserp_engine_budget_state_timeout_count_check check (timeout_count >= 0)
);

alter table openserp_engine_budget_state enable row level security;
-- No anon/authenticated policy is created -- service_role only (BYPASSRLS), matching
-- the pattern already used by property_clusters/property_cluster_members/discovery_candidates.

create index if not exists openserp_engine_budget_state_suspended_until_idx
on openserp_engine_budget_state (suspended_until);

-- ROLLBACK (manual, not auto-applied):
-- drop table if exists openserp_engine_budget_state;
