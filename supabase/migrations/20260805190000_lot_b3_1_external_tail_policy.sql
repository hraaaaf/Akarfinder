-- LOT B3.1 — External Tail Policy.
-- Separates ingestion permission from display permission.
-- This lot creates policy and audit state only; it does not publish candidates.

alter table public.source_policy_registry
  add column if not exists ingestion_gate text not null default 'blocked',
  add column if not exists display_gate text not null default 'hidden';

create table if not exists public.source_external_tail_policy_v1 (
  source_domain text primary key references public.source_policy_registry(source_domain) on delete cascade,
  policy_version text not null default 'external_tail_v1',
  ingestion_gate text not null,
  display_gate text not null,
  review_status text not null,
  tail_priority smallint not null,
  allowed_fields text[] not null default array[
    'generated_title','normalized_city','normalized_property_type','normalized_intent','source_domain','canonical_url'
  ]::text[],
  forbidden_fields text[] not null default array[
    'source_title','snippet','description','images','price','surface'
  ]::text[],
  evidence_basis text not null,
  manual_approval_required boolean not null default true,
  approved_at timestamptz,
  policy_hash text not null,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

truncate table public.source_external_tail_policy_v1;

insert into public.source_external_tail_policy_v1 (
  source_domain,ingestion_gate,display_gate,review_status,tail_priority,
  evidence_basis,manual_approval_required,approved_at,policy_hash
)
select
  p.source_domain,
  coalesce(f.effective_machine_gate,p.machine_gate,'blocked') as ingestion_gate,
  case
    when f.freshness_state not in ('current','due_soon') or f.freshness_state is null then 'hidden'
    when p.authorization_status='prohibited' or p.content_reuse_policy='prohibited' then 'hidden'
    when p.authorization_status='permission_required' or p.terms_status='permission_required' then 'hidden'
    when p.display_policy='canonical_link_only'
      and f.effective_machine_gate='canonical_link_only' then 'external_tail_link_only'
    else 'hidden'
  end as display_gate,
  case
    when f.freshness_state not in ('current','due_soon') or f.freshness_state is null then 'blocked_freshness'
    when p.authorization_status='prohibited' or p.content_reuse_policy='prohibited' then 'prohibited'
    when p.authorization_status='permission_required' or p.terms_status='permission_required' then 'permission_required'
    when p.display_policy='canonical_link_only'
      and f.effective_machine_gate='canonical_link_only' then 'approved_existing_link_policy'
    when p.display_policy='internal_signal_only' then 'pending_review'
    else 'blocked_policy'
  end as review_status,
  case
    when p.display_policy='canonical_link_only' and f.effective_machine_gate='canonical_link_only' then 10
    when p.display_policy='internal_signal_only'
      and p.authorization_status not in ('prohibited','permission_required') then 20
    when p.authorization_status='permission_required' or p.terms_status='permission_required' then 30
    when f.freshness_state not in ('current','due_soon') or f.freshness_state is null then 40
    else 50
  end::smallint as tail_priority,
  concat_ws(' | ',
    'registry='||p.policy_version,
    'authorization='||p.authorization_status,
    'display='||p.display_policy,
    'freshness='||coalesce(f.freshness_state,'missing'),
    'terms='||p.terms_status,
    'robots='||p.robots_status
  ) as evidence_basis,
  not (
    p.display_policy='canonical_link_only'
    and f.effective_machine_gate='canonical_link_only'
    and f.freshness_state in ('current','due_soon')
    and p.authorization_status not in ('prohibited','permission_required')
  ) as manual_approval_required,
  case
    when p.display_policy='canonical_link_only'
      and f.effective_machine_gate='canonical_link_only'
      and f.freshness_state in ('current','due_soon')
      and p.authorization_status not in ('prohibited','permission_required')
    then now()
    else null
  end as approved_at,
  md5(concat_ws('|',
    p.source_domain,p.policy_hash,coalesce(f.freshness_state,'missing'),
    coalesce(f.effective_machine_gate,'missing'),p.authorization_status,
    p.display_policy,p.content_reuse_policy,p.terms_status,p.robots_status
  )) as policy_hash
from public.source_policy_registry p
left join public.source_freshness_state f using(source_domain);

update public.source_policy_registry p
set
  ingestion_gate=e.ingestion_gate,
  display_gate=e.display_gate,
  updated_at=now()
from public.source_external_tail_policy_v1 e
where e.source_domain=p.source_domain;

create table if not exists public.odm_b3_1_external_tail_audit_v1 (
  source_domain text not null,
  canonical_url text not null,
  b3_decision text not null,
  external_tail_review_status text not null,
  display_gate text not null,
  tail_priority smallint not null,
  tail_decision text not null,
  serp_tail_eligible boolean not null default false,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(source_domain,canonical_url)
);

truncate table public.odm_b3_1_external_tail_audit_v1;

insert into public.odm_b3_1_external_tail_audit_v1 (
  source_domain,canonical_url,b3_decision,external_tail_review_status,
  display_gate,tail_priority,tail_decision
)
select
  a.source_domain,a.canonical_url,a.decision,e.review_status,e.display_gate,e.tail_priority,
  case
    when a.decision='qualified_canonical_link'
      and e.display_gate='external_tail_link_only'
      and e.review_status='approved_existing_link_policy'
      then 'eligible_for_activation_review'
    when a.decision='qualified_internal_signal' and e.review_status='pending_review'
      then 'pending_source_review'
    when e.review_status='prohibited' then 'prohibited'
    when e.review_status='permission_required' then 'permission_required'
    when e.review_status='blocked_freshness' then 'blocked_freshness'
    when a.decision like 'reserve_%' then 'deferred_reserve'
    else 'not_tail_candidate'
  end
from public.odm_b3_discovery_expansion_audit_v1 a
join public.source_external_tail_policy_v1 e using(source_domain)
where a.decision<>'already_seeded';

alter table public.source_external_tail_policy_v1 enable row level security;
alter table public.odm_b3_1_external_tail_audit_v1 enable row level security;
revoke all on table public.source_external_tail_policy_v1 from public,anon,authenticated;
revoke all on table public.odm_b3_1_external_tail_audit_v1 from public,anon,authenticated;
grant select,insert,update,delete on table public.source_external_tail_policy_v1 to service_role;
grant select,insert,update,delete on table public.odm_b3_1_external_tail_audit_v1 to service_role;

create or replace function public.odm_b3_1_external_tail_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with source_totals as (
  select
    count(*)::int sources,
    count(*) filter(where display_gate='external_tail_link_only')::int approved_sources,
    count(*) filter(where review_status='pending_review')::int pending_sources,
    count(*) filter(where review_status='prohibited')::int prohibited_sources,
    count(*) filter(where review_status='permission_required')::int permission_required_sources,
    count(*) filter(where review_status='blocked_freshness')::int freshness_blocked_sources
  from public.source_external_tail_policy_v1
), candidate_totals as (
  select
    count(*)::int candidates,
    count(*) filter(where tail_decision='eligible_for_activation_review')::int eligible_for_activation_review,
    count(*) filter(where tail_decision='pending_source_review')::int potential_after_review,
    count(*) filter(where tail_decision='prohibited')::int prohibited,
    count(*) filter(where serp_tail_eligible)::int serp_tail_eligible,
    count(*) filter(where publication_eligible)::int publication_eligible
  from public.odm_b3_1_external_tail_audit_v1
)
select jsonb_build_object(
  'audit_version','odm_b3_1_external_tail_v1',
  'sources',sources,
  'approved_sources',approved_sources,
  'pending_sources',pending_sources,
  'prohibited_sources',prohibited_sources,
  'permission_required_sources',permission_required_sources,
  'freshness_blocked_sources',freshness_blocked_sources,
  'candidates',candidates,
  'eligible_for_activation_review',eligible_for_activation_review,
  'potential_after_review',potential_after_review,
  'prohibited_candidates',prohibited,
  'serp_tail_eligible',serp_tail_eligible,
  'publication_eligible',publication_eligible,
  'fail_closed',serp_tail_eligible=0 and publication_eligible=0
)
from source_totals,candidate_totals;
$$;

revoke all on function public.odm_b3_1_external_tail_report_v1() from public,anon,authenticated;
grant execute on function public.odm_b3_1_external_tail_report_v1() to service_role;

select public.odm_b3_1_external_tail_report_v1();
