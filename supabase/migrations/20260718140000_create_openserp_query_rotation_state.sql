-- OPENSERP-SERVERLESS-STATE-PERSISTENCE-1
-- Objective: replace the local-filesystem rewrite of data/openserp/query-universe-v1.json
--   (which crashes with EROFS on Vercel's read-only serverless filesystem) with a
--   PostgreSQL table holding the mutable rotation state per query. The JSON file
--   itself stays as an immutable, versioned static catalog (query_definition only).
-- Preconditions: none (fresh, additive table).
-- Impact: creates 1 new table + indexes. No existing table touched. No PII, no raw
--   SERP data, no listing URLs stored here -- only rotation bookkeeping keyed by
--   query_id.
-- Lock estimate: negligible (new empty table).
-- Re-run behavior: idempotent via IF NOT EXISTS.
-- Rollback: see bottom of file -- safe, this table starts empty.

create table if not exists openserp_query_rotation_state (
  query_id                 text primary key,
  query_universe_version   text not null,
  query_definition_hash    text not null,
  last_executed_at         timestamptz,
  next_eligible_at         timestamptz,
  failure_count            integer not null default 0,
  successful_run_count     integer not null default 0,
  discovery_yield          integer not null default 0,
  last_engine              text,
  last_run_id              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint openserp_query_rotation_state_failure_count_check check (failure_count >= 0),
  constraint openserp_query_rotation_state_success_count_check check (successful_run_count >= 0),
  constraint openserp_query_rotation_state_yield_check check (discovery_yield >= 0),
  constraint openserp_query_rotation_state_engine_check check (
    last_engine is null or last_engine in ('bing', 'duckduckgo', 'ecosia')
  )
);

alter table openserp_query_rotation_state enable row level security;
-- No anon/authenticated policy is created -- service_role only (BYPASSRLS), matching
-- the pattern already used by property_clusters/property_cluster_members/discovery_candidates.

create index if not exists openserp_query_rotation_state_next_eligible_idx
on openserp_query_rotation_state (next_eligible_at);

create index if not exists openserp_query_rotation_state_last_executed_idx
on openserp_query_rotation_state (last_executed_at);

-- ROLLBACK (manual, not auto-applied):
-- drop table if exists openserp_query_rotation_state;
