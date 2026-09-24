-- AKARFINDER-HA-REPLICATION-CANARY-V1
-- Dedicated, isolated PostgreSQL table for HA/DR replication rehearsals.
-- Repository-only preparation in this branch. Do not apply to production
-- before HA-01/HA-03 gates and an explicit production DB change approval.

create table if not exists public.akarfinder_ha_replication_canary (
  id uuid primary key default gen_random_uuid(),
  probe_run_id uuid not null,
  payload text not null,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.akarfinder_ha_replication_canary
  replica identity default;

alter table public.akarfinder_ha_replication_canary
  enable row level security;

-- Keep the canary out of application/Data API access. Rehearsal mutations use
-- an approved direct PostgreSQL operator connection only.
revoke all on table public.akarfinder_ha_replication_canary from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.akarfinder_ha_replication_canary from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.akarfinder_ha_replication_canary from authenticated';
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'revoke all on table public.akarfinder_ha_replication_canary from service_role';
  end if;
end $$;

comment on table public.akarfinder_ha_replication_canary is
'Dedicated AkarFinder HA/DR replication canary. Not application data. Direct operator DB access only; no Data API policies.';

comment on column public.akarfinder_ha_replication_canary.probe_run_id is
'Groups INSERT/UPDATE/DELETE mutations for one HA rehearsal so cleanup and evidence are deterministic.';

comment on column public.akarfinder_ha_replication_canary.version is
'Explicit rehearsal version incremented by the test operator; no trigger dependency.';
