-- LOT B1 — Source Freshness Engine.
-- Source-level policy/evidence freshness, fail-closed, with immutable transition audit.

create table if not exists public.source_freshness_state (
  source_domain text primary key references public.source_policy_registry(source_domain) on update cascade on delete restrict,
  policy_version text not null,
  policy_hash text not null,
  evaluated_at timestamptz not null,
  freshness_deadline_at timestamptz not null,
  days_until_deadline integer not null,
  freshness_state text not null check (freshness_state in ('current','due_soon','overdue','blocked_unverified')),
  risk_priority smallint not null check (risk_priority between 0 and 100),
  base_machine_gate text not null,
  effective_machine_gate text not null check (effective_machine_gate in ('blocked_unverified','blocked_review_overdue','blocked_invalid_no_bypass','internal_signal_only','canonical_link_only','authorized_detail_feed','partner_feed')),
  revalidation_required boolean not null,
  reason text not null,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_freshness_transition_events (
  id bigint generated always as identity primary key,
  source_domain text not null references public.source_policy_registry(source_domain) on update cascade on delete restrict,
  previous_state text,
  next_state text not null,
  previous_effective_gate text,
  next_effective_gate text not null,
  evaluated_at timestamptz not null,
  freshness_deadline_at timestamptz not null,
  reason text not null,
  policy_hash text not null,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.source_freshness_state enable row level security;
alter table public.source_freshness_transition_events enable row level security;
revoke all on table public.source_freshness_state from public,anon,authenticated;
revoke all on table public.source_freshness_transition_events from public,anon,authenticated;
grant select,insert,update,delete on table public.source_freshness_state to service_role;
grant select,insert on table public.source_freshness_transition_events to service_role;
grant usage,select on sequence public.source_freshness_transition_events_id_seq to service_role;

create or replace function public.odm_refresh_b1_source_freshness_engine_v1(p_now timestamptz default now())
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_changed integer := 0;
  v_total integer := 0;
  v_current integer := 0;
  v_due integer := 0;
  v_overdue integer := 0;
  v_blocked integer := 0;
begin
  create temporary table if not exists pg_temp.b1_source_freshness_next (
    source_domain text primary key,
    policy_version text,
    policy_hash text,
    evaluated_at timestamptz,
    freshness_deadline_at timestamptz,
    days_until_deadline integer,
    freshness_state text,
    risk_priority smallint,
    base_machine_gate text,
    effective_machine_gate text,
    revalidation_required boolean,
    reason text
  ) on commit drop;
  truncate pg_temp.b1_source_freshness_next;

  insert into pg_temp.b1_source_freshness_next
  select
    r.source_domain,
    r.policy_version,
    r.policy_hash,
    p_now,
    least(
      coalesce(r.policy_expires_at, r.next_review_at),
      coalesce(r.evidence_observed_at, r.reviewed_at) + make_interval(days => r.max_revalidation_interval_days)
    ) as freshness_deadline_at,
    floor(extract(epoch from (
      least(
        coalesce(r.policy_expires_at, r.next_review_at),
        coalesce(r.evidence_observed_at, r.reviewed_at) + make_interval(days => r.max_revalidation_interval_days)
      ) - p_now
    )) / 86400)::integer as days_until_deadline,
    case
      when r.policy_hash is null or cardinality(r.allowed_discovery_channels)=0 or r.no_bypass_required=false then 'blocked_unverified'
      when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days)) < p_now then 'overdue'
      when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days)) <= p_now + interval '3 days' then 'due_soon'
      else 'current'
    end,
    least(100,greatest(0,
      case when r.content_reuse_policy in ('prohibited','permission_required') then 25 else 10 end +
      case when r.legal_review_required then 20 else 0 end +
      case when r.partnership_required then 15 else 0 end +
      case when r.robots_status='unverified' then 15 else 0 end +
      case when r.terms_status in ('unverified','not_found') then 15 else 0 end +
      case when r.policy_confidence_score <= 2 then 10 else 0 end
    ))::smallint,
    r.machine_gate,
    case
      when r.policy_hash is null or cardinality(r.allowed_discovery_channels)=0 or r.no_bypass_required=false then 'blocked_unverified'
      when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days)) < p_now then 'blocked_review_overdue'
      else r.machine_gate
    end,
    case
      when r.policy_hash is null or cardinality(r.allowed_discovery_channels)=0 or r.no_bypass_required=false then true
      when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days)) <= p_now + interval '3 days' then true
      else false
    end,
    case
      when r.policy_hash is null then 'Missing policy hash; source blocked.'
      when cardinality(r.allowed_discovery_channels)=0 then 'No allowed discovery channel; source blocked.'
      when r.no_bypass_required=false then 'No-bypass invariant invalid; source blocked.'
      when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days)) < p_now then 'Source policy or evidence freshness expired; acquisition blocked pending review.'
      when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days)) <= p_now + interval '3 days' then 'Source review is due within three days.'
      else 'Source policy and evidence remain inside the certified freshness window.'
    end
  from public.source_policy_registry r;

  insert into public.source_freshness_transition_events(
    source_domain,previous_state,next_state,previous_effective_gate,next_effective_gate,
    evaluated_at,freshness_deadline_at,reason,policy_hash
  )
  select n.source_domain,s.freshness_state,n.freshness_state,s.effective_machine_gate,n.effective_machine_gate,
    n.evaluated_at,n.freshness_deadline_at,n.reason,n.policy_hash
  from pg_temp.b1_source_freshness_next n
  left join public.source_freshness_state s using(source_domain)
  where s.source_domain is null
     or s.freshness_state is distinct from n.freshness_state
     or s.effective_machine_gate is distinct from n.effective_machine_gate
     or s.policy_hash is distinct from n.policy_hash;
  get diagnostics v_changed=row_count;

  insert into public.source_freshness_state(
    source_domain,policy_version,policy_hash,evaluated_at,freshness_deadline_at,days_until_deadline,
    freshness_state,risk_priority,base_machine_gate,effective_machine_gate,revalidation_required,reason
  )
  select source_domain,policy_version,policy_hash,evaluated_at,freshness_deadline_at,days_until_deadline,
    freshness_state,risk_priority,base_machine_gate,effective_machine_gate,revalidation_required,reason
  from pg_temp.b1_source_freshness_next
  on conflict(source_domain) do update set
    policy_version=excluded.policy_version,
    policy_hash=excluded.policy_hash,
    evaluated_at=excluded.evaluated_at,
    freshness_deadline_at=excluded.freshness_deadline_at,
    days_until_deadline=excluded.days_until_deadline,
    freshness_state=excluded.freshness_state,
    risk_priority=excluded.risk_priority,
    base_machine_gate=excluded.base_machine_gate,
    effective_machine_gate=excluded.effective_machine_gate,
    revalidation_required=excluded.revalidation_required,
    reason=excluded.reason,
    publication_eligible=false,
    updated_at=p_now;

  select count(*),
    count(*) filter(where freshness_state='current'),
    count(*) filter(where freshness_state='due_soon'),
    count(*) filter(where freshness_state='overdue'),
    count(*) filter(where freshness_state='blocked_unverified')
  into v_total,v_current,v_due,v_overdue,v_blocked
  from public.source_freshness_state;

  if v_total<>(select count(*) from public.source_policy_registry) then
    raise exception 'B1 coverage mismatch: freshness %, registry %',v_total,(select count(*) from public.source_policy_registry);
  end if;

  return jsonb_build_object(
    'evaluated_at',p_now,'sources',v_total,'transition_events_written',v_changed,
    'states',jsonb_build_object('current',v_current,'due_soon',v_due,'overdue',v_overdue,'blocked_unverified',v_blocked),
    'fail_closed',v_overdue+v_blocked=(select count(*) from public.source_freshness_state where effective_machine_gate in ('blocked_review_overdue','blocked_unverified','blocked_invalid_no_bypass'))
  );
end;$$;

create or replace function public.odm_b1_source_freshness_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with x as (
  select count(*)::int total,
    count(*) filter(where freshness_state='current')::int current_count,
    count(*) filter(where freshness_state='due_soon')::int due_soon_count,
    count(*) filter(where freshness_state='overdue')::int overdue_count,
    count(*) filter(where freshness_state='blocked_unverified')::int blocked_count,
    count(*) filter(where revalidation_required)::int revalidation_required,
    count(*) filter(where effective_machine_gate='canonical_link_only')::int canonical_link_only,
    count(*) filter(where effective_machine_gate='internal_signal_only')::int internal_signal_only,
    count(*) filter(where effective_machine_gate like 'blocked%')::int blocked_gates,
    count(*) filter(where publication_eligible)::int publication_eligible,
    max(evaluated_at) evaluated_at
  from public.source_freshness_state
),r as (select count(*)::int registry_total from public.source_policy_registry)
select jsonb_build_object(
  'audit_version','odm_b1_source_freshness_engine_v1',
  'sources',x.total,'registry_sources',r.registry_total,'evaluated_at',x.evaluated_at,
  'states',jsonb_build_object('current',x.current_count,'due_soon',x.due_soon_count,'overdue',x.overdue_count,'blocked_unverified',x.blocked_count),
  'effective_gates',jsonb_build_object('canonical_link_only',x.canonical_link_only,'internal_signal_only',x.internal_signal_only,'blocked',x.blocked_gates),
  'revalidation_required',x.revalidation_required,
  'publication_eligible',x.publication_eligible,
  'coverage_complete',x.total=r.registry_total,
  'fail_closed',x.total=r.registry_total and x.publication_eligible=0 and x.overdue_count+x.blocked_count=x.blocked_gates
) from x cross join r;$$;

revoke all on function public.odm_refresh_b1_source_freshness_engine_v1(timestamptz) from public,anon,authenticated;
revoke all on function public.odm_b1_source_freshness_report_v1() from public,anon,authenticated;
grant execute on function public.odm_refresh_b1_source_freshness_engine_v1(timestamptz) to service_role;
grant execute on function public.odm_b1_source_freshness_report_v1() to service_role;

select public.odm_refresh_b1_source_freshness_engine_v1(now());
select public.odm_b1_source_freshness_report_v1();
