-- Observation Ledger V1 persistence.
-- Derived events only: source_offer_observations remains the canonical append-only source of truth.

create table if not exists public.observation_ledger_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  source_offer_id bigint not null references public.listing_sources(id) on delete cascade,
  event_type text not null check (event_type in (
    'first_observed',
    'price_decreased',
    'price_increased',
    'price_disclosed',
    'price_removed',
    'content_changed',
    'surface_changed',
    'withdrawn',
    'reactivated',
    'availability_changed'
  )),
  occurred_at timestamptz not null,
  previous_observation_id uuid references public.source_offer_observations(id) on delete restrict,
  current_observation_id uuid not null references public.source_offer_observations(id) on delete restrict,
  previous_value jsonb,
  current_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  methodology_version text not null default 'observation_ledger_v1',
  input_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint observation_ledger_events_event_key_unique unique (event_key),
  constraint observation_ledger_events_distinct_observations check (
    previous_observation_id is null or previous_observation_id <> current_observation_id
  )
);

create index if not exists observation_ledger_events_offer_time_idx
  on public.observation_ledger_events (source_offer_id, occurred_at desc);

create index if not exists observation_ledger_events_type_time_idx
  on public.observation_ledger_events (event_type, occurred_at desc);

alter table public.observation_ledger_events enable row level security;

revoke all on table public.observation_ledger_events from public, anon, authenticated;
grant select, insert on table public.observation_ledger_events to service_role;

create or replace function public.persist_observation_ledger_event(
  p_event_key text,
  p_source_offer_id bigint,
  p_event_type text,
  p_occurred_at timestamptz,
  p_previous_observation_id uuid,
  p_current_observation_id uuid,
  p_previous_value jsonb,
  p_current_value jsonb,
  p_metadata jsonb,
  p_input_snapshot text,
  p_methodology_version text default 'observation_ledger_v1'
)
returns public.observation_ledger_events
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  persisted public.observation_ledger_events;
begin
  if p_event_key is null or btrim(p_event_key) = '' then
    raise exception 'event_key is required';
  end if;

  if p_input_snapshot is null or btrim(p_input_snapshot) = '' then
    raise exception 'input_snapshot is required';
  end if;

  insert into public.observation_ledger_events (
    event_key,
    source_offer_id,
    event_type,
    occurred_at,
    previous_observation_id,
    current_observation_id,
    previous_value,
    current_value,
    metadata,
    methodology_version,
    input_snapshot
  ) values (
    p_event_key,
    p_source_offer_id,
    p_event_type,
    p_occurred_at,
    p_previous_observation_id,
    p_current_observation_id,
    p_previous_value,
    p_current_value,
    coalesce(p_metadata, '{}'::jsonb),
    p_methodology_version,
    p_input_snapshot
  )
  on conflict (event_key) do update
    set event_key = excluded.event_key
  returning * into persisted;

  return persisted;
end;
$$;

revoke all on function public.persist_observation_ledger_event(
  text, bigint, text, timestamptz, uuid, uuid, jsonb, jsonb, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.persist_observation_ledger_event(
  text, bigint, text, timestamptz, uuid, uuid, jsonb, jsonb, jsonb, text, text
) to service_role;

comment on table public.observation_ledger_events is
  'Internal, derived and reproducible temporal events. source_offer_observations remains the source of truth.';
