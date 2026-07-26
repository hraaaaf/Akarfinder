create table if not exists public.source_offer_recrawl_schedule (
  source_offer_id bigint primary key,
  source_key text not null,
  city text,
  next_recrawl_at timestamptz not null,
  priority smallint not null check (priority between 0 and 100),
  reason text not null,
  policy_state text not null default 'allowed' check (policy_state in ('allowed', 'paused', 'robots_blocked', 'legal_review')),
  failure_count integer not null default 0 check (failure_count >= 0),
  lease_token uuid,
  leased_by text,
  lease_until timestamptz,
  publication_eligible boolean not null default false check (publication_eligible = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists source_offer_recrawl_schedule_due_idx
  on public.source_offer_recrawl_schedule (next_recrawl_at, priority desc)
  where policy_state = 'allowed';

create table if not exists public.source_offer_recrawl_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_key text not null unique,
  source_offer_id bigint not null,
  source_key text not null,
  worker_id text not null,
  lease_token uuid not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  outcome_kind text not null check (outcome_kind in ('success', 'timeout', 'network', 'http', 'robots', 'policy', 'worker_exception')),
  http_status integer,
  observed boolean not null default false,
  disposition text not null check (disposition in ('complete', 'retry', 'verify_later', 'blocked')),
  decision_reason text not null,
  next_retry_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  publication_eligible boolean not null default false check (publication_eligible = false),
  created_at timestamptz not null default now(),
  check (completed_at >= started_at)
);

create index if not exists source_offer_recrawl_attempts_offer_idx
  on public.source_offer_recrawl_attempts (source_offer_id, completed_at desc);

alter table public.source_offer_recrawl_schedule enable row level security;
alter table public.source_offer_recrawl_attempts enable row level security;

revoke all on public.source_offer_recrawl_schedule from public, anon, authenticated;
revoke all on public.source_offer_recrawl_attempts from public, anon, authenticated;
grant select, insert, update on public.source_offer_recrawl_schedule to service_role;
grant select, insert on public.source_offer_recrawl_attempts to service_role;

create or replace function public.upsert_source_offer_recrawl_schedule(
  p_source_offer_id bigint,
  p_source_key text,
  p_city text,
  p_next_recrawl_at timestamptz,
  p_priority integer,
  p_reason text,
  p_policy_state text default 'allowed',
  p_failure_count integer default 0
)
returns public.source_offer_recrawl_schedule
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.source_offer_recrawl_schedule;
begin
  if p_source_offer_id is null or p_source_offer_id <= 0 then raise exception 'invalid source_offer_id'; end if;
  if nullif(trim(p_source_key), '') is null then raise exception 'source_key is required'; end if;
  if p_priority < 0 or p_priority > 100 then raise exception 'priority must be between 0 and 100'; end if;
  if p_policy_state not in ('allowed', 'paused', 'robots_blocked', 'legal_review') then raise exception 'invalid policy_state'; end if;
  if p_failure_count < 0 then raise exception 'failure_count must be non-negative'; end if;

  insert into public.source_offer_recrawl_schedule (
    source_offer_id, source_key, city, next_recrawl_at, priority, reason, policy_state, failure_count
  ) values (
    p_source_offer_id, trim(p_source_key), nullif(trim(p_city), ''), p_next_recrawl_at,
    p_priority, p_reason, p_policy_state, p_failure_count
  )
  on conflict (source_offer_id) do update set
    source_key = excluded.source_key,
    city = excluded.city,
    next_recrawl_at = excluded.next_recrawl_at,
    priority = excluded.priority,
    reason = excluded.reason,
    policy_state = excluded.policy_state,
    failure_count = excluded.failure_count,
    updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.claim_due_recrawl_jobs(
  p_worker_id text,
  p_limit integer,
  p_now timestamptz default now(),
  p_lease_minutes integer default 15
)
returns setof public.source_offer_recrawl_schedule
language plpgsql
security invoker
set search_path = public
as $$
begin
  if nullif(trim(p_worker_id), '') is null then raise exception 'worker_id is required'; end if;
  if p_limit < 1 or p_limit > 500 then raise exception 'limit must be between 1 and 500'; end if;
  if p_lease_minutes < 1 or p_lease_minutes > 120 then raise exception 'lease_minutes must be between 1 and 120'; end if;

  return query
  with due as (
    select s.source_offer_id
    from public.source_offer_recrawl_schedule s
    where s.policy_state = 'allowed'
      and s.next_recrawl_at <= p_now
      and (s.lease_until is null or s.lease_until <= p_now)
    order by s.priority desc, s.next_recrawl_at asc, s.source_offer_id asc
    for update skip locked
    limit p_limit
  )
  update public.source_offer_recrawl_schedule s
  set lease_token = gen_random_uuid(),
      leased_by = trim(p_worker_id),
      lease_until = p_now + make_interval(mins => p_lease_minutes),
      updated_at = p_now
  from due
  where s.source_offer_id = due.source_offer_id
  returning s.*;
end;
$$;

create or replace function public.release_recrawl_claim(
  p_source_offer_id bigint,
  p_lease_token uuid,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.source_offer_recrawl_schedule
  set lease_token = null,
      leased_by = null,
      lease_until = null,
      reason = coalesce(nullif(trim(p_reason), ''), reason),
      updated_at = now()
  where source_offer_id = p_source_offer_id
    and lease_token = p_lease_token;
  return found;
end;
$$;

create or replace function public.record_recrawl_attempt(
  p_attempt_key text,
  p_source_offer_id bigint,
  p_source_key text,
  p_worker_id text,
  p_lease_token uuid,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_outcome_kind text,
  p_http_status integer,
  p_observed boolean,
  p_disposition text,
  p_decision_reason text,
  p_next_retry_at timestamptz,
  p_policy_state text,
  p_failure_count integer,
  p_metadata jsonb default '{}'::jsonb
)
returns public.source_offer_recrawl_attempts
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attempt public.source_offer_recrawl_attempts;
begin
  if p_outcome_kind not in ('success', 'timeout', 'network', 'http', 'robots', 'policy', 'worker_exception') then raise exception 'invalid outcome_kind'; end if;
  if p_disposition not in ('complete', 'retry', 'verify_later', 'blocked') then raise exception 'invalid disposition'; end if;
  if p_policy_state not in ('allowed', 'paused', 'robots_blocked', 'legal_review') then raise exception 'invalid policy_state'; end if;

  insert into public.source_offer_recrawl_attempts (
    attempt_key, source_offer_id, source_key, worker_id, lease_token, started_at, completed_at,
    outcome_kind, http_status, observed, disposition, decision_reason, next_retry_at, metadata
  ) values (
    p_attempt_key, p_source_offer_id, p_source_key, p_worker_id, p_lease_token, p_started_at, p_completed_at,
    p_outcome_kind, p_http_status, p_observed, p_disposition, p_decision_reason, p_next_retry_at, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (attempt_key) do update set attempt_key = excluded.attempt_key
  returning * into v_attempt;

  update public.source_offer_recrawl_schedule
  set next_recrawl_at = coalesce(p_next_retry_at, case when p_disposition = 'complete' then p_completed_at + interval '7 days' else next_recrawl_at end),
      policy_state = p_policy_state,
      failure_count = p_failure_count,
      lease_token = null,
      leased_by = null,
      lease_until = null,
      reason = p_decision_reason,
      updated_at = p_completed_at
  where source_offer_id = p_source_offer_id
    and lease_token = p_lease_token;

  if not found then raise exception 'recrawl claim is missing or expired'; end if;
  return v_attempt;
end;
$$;

revoke all on function public.upsert_source_offer_recrawl_schedule(bigint, text, text, timestamptz, integer, text, text, integer) from public, anon, authenticated;
revoke all on function public.claim_due_recrawl_jobs(text, integer, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.release_recrawl_claim(bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.record_recrawl_attempt(text, bigint, text, text, uuid, timestamptz, timestamptz, text, integer, boolean, text, text, timestamptz, text, integer, jsonb) from public, anon, authenticated;

grant execute on function public.upsert_source_offer_recrawl_schedule(bigint, text, text, timestamptz, integer, text, text, integer) to service_role;
grant execute on function public.claim_due_recrawl_jobs(text, integer, timestamptz, integer) to service_role;
grant execute on function public.release_recrawl_claim(bigint, uuid, text) to service_role;
grant execute on function public.record_recrawl_attempt(text, bigint, text, text, uuid, timestamptz, timestamptz, text, integer, boolean, text, text, timestamptz, text, integer, jsonb) to service_role;
