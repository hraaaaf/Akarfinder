begin;

-- OPENSERP-SERVERLESS-STATE-REAL-RUN-VALIDATION-2 -- Phase 4.
-- Single-paste Production application of the lease-based run-lock
-- migration, validated locally (PGlite) in
-- OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1. Additive only -- no
-- DROP/TRUNCATE/DELETE, no listing table touched, no discovery_candidates
-- change. Auto-rolls-back on any verification mismatch. begin; is
-- deliberately the very first token of this file (a prior mission found a
-- copy/paste path that truncates the first few characters of a leading
-- comment line).

create table if not exists openserp_ingestion_run_lock (
  lock_name    text primary key,
  owner_id     text not null,
  acquired_at  timestamptz not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table openserp_ingestion_run_lock enable row level security;

create index if not exists openserp_ingestion_run_lock_expires_idx
on openserp_ingestion_run_lock (expires_at);

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

-- verification block: raises (aborting the whole transaction) on any
-- mismatch versus the expected post-migration state.
do $$
declare
  row_count_before integer;
  policy_count integer;
  rls_enabled boolean;
  func_count integer;
begin
  select count(*) into row_count_before from openserp_ingestion_run_lock;
  if row_count_before <> 0 then
    raise exception 'VERIFICATION FAILED: expected 0 rows in a fresh table, got %', row_count_before;
  end if;

  select count(*) into policy_count from pg_policies where tablename = 'openserp_ingestion_run_lock';
  if policy_count <> 0 then
    raise exception 'VERIFICATION FAILED: expected 0 policies, got %', policy_count;
  end if;

  select relrowsecurity into rls_enabled from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'openserp_ingestion_run_lock';
  if not rls_enabled then
    raise exception 'VERIFICATION FAILED: RLS not enabled on openserp_ingestion_run_lock';
  end if;

  select count(*) into func_count from pg_proc where proname in ('acquire_openserp_ingestion_lock', 'release_openserp_ingestion_lock');
  if func_count <> 2 then
    raise exception 'VERIFICATION FAILED: expected 2 functions, got %', func_count;
  end if;

  -- functional smoke test: acquire, confirm held, confirm a second owner
  -- is refused, release, confirm empty again -- all within this same
  -- transaction, rolled back implicitly if anything is wrong, and
  -- explicitly cleaned up at the end either way so this migration leaves
  -- the table genuinely empty on success.
  if not exists (
    select 1 from acquire_openserp_ingestion_lock('migration-smoke-test', 'owner-a', 60) where acquired
  ) then
    raise exception 'VERIFICATION FAILED: smoke-test acquire by owner-a did not succeed';
  end if;

  if exists (
    select 1 from acquire_openserp_ingestion_lock('migration-smoke-test', 'owner-b', 60) where acquired
  ) then
    raise exception 'VERIFICATION FAILED: smoke-test acquire by owner-b should have been refused (owner-a still holds an unexpired lease)';
  end if;

  if not (select release_openserp_ingestion_lock('migration-smoke-test', 'owner-a')) then
    raise exception 'VERIFICATION FAILED: smoke-test release by the correct owner should have succeeded';
  end if;

  if exists (select 1 from openserp_ingestion_run_lock where lock_name = 'migration-smoke-test') then
    raise exception 'VERIFICATION FAILED: smoke-test row should be gone after release';
  end if;

  raise notice 'VERIFICATION PASSED: table empty, 0 policies, RLS enabled, 2 functions present, acquire/refuse/release smoke test all correct';
end $$;

commit;
