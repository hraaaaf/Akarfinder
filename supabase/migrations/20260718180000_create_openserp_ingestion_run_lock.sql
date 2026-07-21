-- OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 7.
-- Objective: replace the compare-and-set lock built on discovery_candidates
--   (a plain INSERT that conflicts on a unique index, with a "read the
--   stale row, then conditionally UPDATE it" recovery path -- exactly the
--   read-then-write race condition this mission was told to avoid) with a
--   dedicated lease-based lock table where acquisition, expiry-based
--   takeover, and release are each a single atomic SQL statement.
-- Preconditions: none (fresh, additive table). The prior lock's one
--   orphaned sentinel row (from the FUNCTION_INVOCATION_TIMEOUT incident)
--   was already deleted via a separate, explicitly-authorized, targeted
--   DELETE -- not part of this migration.
-- Impact: creates 1 new table + 2 new functions. No existing table
--   touched. No PII, no raw SERP data, no listing URLs.
-- Lock estimate: negligible (new empty table).
-- Re-run behavior: idempotent via IF NOT EXISTS / CREATE OR REPLACE.
-- Rollback: see bottom of file -- safe, this table starts empty.

create table if not exists openserp_ingestion_run_lock (
  lock_name    text primary key,
  owner_id     text not null,
  acquired_at  timestamptz not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table openserp_ingestion_run_lock enable row level security;
-- No anon/authenticated policy is created -- service_role only (BYPASSRLS).
-- The two functions below are SECURITY INVOKER (Postgres default) so that
-- even if EXECUTE were ever accidentally granted to a low-privilege role,
-- the underlying RLS (0 policies) still blocks any real effect -- the
-- same defense-in-depth principle applied throughout this project's other
-- OpenSERP state tables.

create index if not exists openserp_ingestion_run_lock_expires_idx
on openserp_ingestion_run_lock (expires_at);

-- Atomically acquires the named lock for p_owner_id, OR takes it over if
-- the existing holder's lease has already expired -- both outcomes are a
-- single INSERT ... ON CONFLICT ... DO UPDATE ... WHERE statement, so two
-- concurrent callers can never both believe they hold the lock (Postgres
-- serializes the conflicting-row resolution). Returns whether THIS call's
-- attempt is the one that took effect, by checking the affected row count
-- via GET DIAGNOSTICS rather than re-reading the row afterward (a second
-- read would itself be a race).
create or replace function acquire_openserp_ingestion_lock(
  p_lock_name text,
  p_owner_id text,
  p_lease_seconds integer
) returns table (
  acquired boolean,
  current_owner_id text,
  current_expires_at timestamptz
)
language plpgsql
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_expires timestamptz := v_now + make_interval(secs => greatest(p_lease_seconds, 1));
  v_rows_affected integer;
begin
  insert into openserp_ingestion_run_lock (lock_name, owner_id, acquired_at, expires_at, updated_at)
  values (p_lock_name, p_owner_id, v_now, v_expires, v_now)
  on conflict (lock_name) do update
    set owner_id = excluded.owner_id,
        acquired_at = excluded.acquired_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    where openserp_ingestion_run_lock.expires_at < v_now;

  get diagnostics v_rows_affected = row_count;

  return query
    select (v_rows_affected = 1), l.owner_id, l.expires_at
    from openserp_ingestion_run_lock l
    where l.lock_name = p_lock_name;
end;
$$;

revoke execute on function acquire_openserp_ingestion_lock(text, text, integer) from public;
grant execute on function acquire_openserp_ingestion_lock(text, text, integer) to service_role;

-- Releases the named lock ONLY if p_owner_id still matches the current
-- holder -- a stale/killed invocation's eventual (or never-called)
-- release can never delete a different, later owner's active lease. A
-- single DELETE ... WHERE lock_name = ... AND owner_id = ... is already
-- atomic; no read-then-write is needed here.
create or replace function release_openserp_ingestion_lock(
  p_lock_name text,
  p_owner_id text
) returns boolean
language plpgsql
as $$
declare
  v_deleted integer;
begin
  delete from openserp_ingestion_run_lock
  where lock_name = p_lock_name and owner_id = p_owner_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke execute on function release_openserp_ingestion_lock(text, text) from public;
grant execute on function release_openserp_ingestion_lock(text, text) to service_role;

-- ROLLBACK (manual, not auto-applied):
-- drop function if exists release_openserp_ingestion_lock(text, text);
-- drop function if exists acquire_openserp_ingestion_lock(text, text, integer);
-- drop table if exists openserp_ingestion_run_lock;
