create table if not exists public.source_offer_lifecycle_signals (
  id uuid primary key default gen_random_uuid(),
  source_offer_id bigint not null references public.listing_sources(id) on delete cascade,
  evaluation_key text not null,
  evaluated_at timestamptz not null,
  last_observed_at timestamptz,
  freshness_score integer,
  freshness_band text not null,
  lifecycle_state text not null,
  lifecycle_score integer,
  volatility_score integer,
  observation_density numeric not null default 0,
  confidence_score integer not null,
  next_recheck_at timestamptz,
  recrawl_priority integer not null,
  evidence_event_keys jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  methodology_version text not null default 'freshness_lifecycle_v1',
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  constraint source_offer_lifecycle_signals_freshness_score check (freshness_score is null or freshness_score between 0 and 100),
  constraint source_offer_lifecycle_signals_lifecycle_score check (lifecycle_score is null or lifecycle_score between 0 and 100),
  constraint source_offer_lifecycle_signals_volatility_score check (volatility_score is null or volatility_score between 0 and 100),
  constraint source_offer_lifecycle_signals_confidence_score check (confidence_score between 0 and 100),
  constraint source_offer_lifecycle_signals_recrawl_priority check (recrawl_priority between 0 and 100),
  constraint source_offer_lifecycle_signals_band check (freshness_band in ('fresh','recent','aging','stale','unknown')),
  constraint source_offer_lifecycle_signals_state check (lifecycle_state in ('unknown','newly_observed','active','recently_updated','price_changed','content_changed','probably_stale','withdrawn','reactivated')),
  constraint source_offer_lifecycle_signals_internal_only check (publication_eligible = false),
  constraint source_offer_lifecycle_signals_evaluation_key_unique unique (evaluation_key)
);

create index if not exists source_offer_lifecycle_signals_offer_evaluated_idx
  on public.source_offer_lifecycle_signals(source_offer_id, evaluated_at desc);

create index if not exists source_offer_lifecycle_signals_recheck_idx
  on public.source_offer_lifecycle_signals(next_recheck_at, recrawl_priority desc)
  where publication_eligible = false;

alter table public.source_offer_lifecycle_signals enable row level security;
revoke all on public.source_offer_lifecycle_signals from public, anon, authenticated;
grant select, insert on public.source_offer_lifecycle_signals to service_role;

create or replace function public.persist_source_offer_lifecycle_signal(
  p_source_offer_id bigint,
  p_evaluation_key text,
  p_evaluated_at timestamptz,
  p_last_observed_at timestamptz,
  p_freshness_score integer,
  p_freshness_band text,
  p_lifecycle_state text,
  p_lifecycle_score integer,
  p_volatility_score integer,
  p_observation_density numeric,
  p_confidence_score integer,
  p_next_recheck_at timestamptz,
  p_recrawl_priority integer,
  p_evidence_event_keys jsonb,
  p_blockers jsonb,
  p_methodology_version text default 'freshness_lifecycle_v1'
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.source_offer_lifecycle_signals (
    source_offer_id, evaluation_key, evaluated_at, last_observed_at,
    freshness_score, freshness_band, lifecycle_state, lifecycle_score,
    volatility_score, observation_density, confidence_score, next_recheck_at,
    recrawl_priority, evidence_event_keys, blockers, methodology_version,
    publication_eligible
  ) values (
    p_source_offer_id, p_evaluation_key, p_evaluated_at, p_last_observed_at,
    p_freshness_score, p_freshness_band, p_lifecycle_state, p_lifecycle_score,
    p_volatility_score, p_observation_density, p_confidence_score, p_next_recheck_at,
    p_recrawl_priority, coalesce(p_evidence_event_keys, '[]'::jsonb),
    coalesce(p_blockers, '[]'::jsonb), p_methodology_version, false
  )
  on conflict (evaluation_key) do update set
    evaluated_at = excluded.evaluated_at,
    last_observed_at = excluded.last_observed_at,
    freshness_score = excluded.freshness_score,
    freshness_band = excluded.freshness_band,
    lifecycle_state = excluded.lifecycle_state,
    lifecycle_score = excluded.lifecycle_score,
    volatility_score = excluded.volatility_score,
    observation_density = excluded.observation_density,
    confidence_score = excluded.confidence_score,
    next_recheck_at = excluded.next_recheck_at,
    recrawl_priority = excluded.recrawl_priority,
    evidence_event_keys = excluded.evidence_event_keys,
    blockers = excluded.blockers,
    methodology_version = excluded.methodology_version,
    publication_eligible = false
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.persist_source_offer_lifecycle_signal(bigint,text,timestamptz,timestamptz,integer,text,text,integer,integer,numeric,integer,timestamptz,integer,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.persist_source_offer_lifecycle_signal(bigint,text,timestamptz,timestamptz,integer,text,text,integer,integer,numeric,integer,timestamptz,integer,jsonb,jsonb,text) to service_role;
