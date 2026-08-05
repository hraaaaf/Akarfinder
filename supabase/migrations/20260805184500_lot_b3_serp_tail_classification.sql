-- LOT B3 extension — SERP tail classification.
-- Ranking position never overrides Source Registry or freshness policy.

alter table public.odm_b3_discovery_expansion_audit_v1
  add column if not exists serp_tail_eligible boolean not null default false,
  add column if not exists serp_tier text not null default 'internal_only',
  add column if not exists serp_priority smallint not null default 1000;

update public.odm_b3_discovery_expansion_audit_v1
set
  serp_tail_eligible = case
    when decision='qualified_canonical_link'
      and freshness_state in ('current','due_soon')
      and effective_machine_gate='canonical_link_only'
    then true
    else false
  end,
  serp_tier = case
    when decision='qualified_canonical_link'
      and freshness_state in ('current','due_soon')
      and effective_machine_gate='canonical_link_only'
    then 'external_link_tail'
    when decision='qualified_internal_signal' then 'internal_signal_only'
    when decision like 'reserve_%' then 'deferred_hidden'
    when decision='already_seeded' then 'already_indexed'
    else 'internal_only'
  end,
  serp_priority = case
    when decision='qualified_canonical_link'
      and freshness_state in ('current','due_soon')
      and effective_machine_gate='canonical_link_only'
    then 900
    when decision='qualified_internal_signal' then 1100
    when decision like 'reserve_%' then 1200 + reserve_priority
    when decision='already_seeded' then 0
    else 1300
  end;

create or replace function public.odm_b3_discovery_expansion_report_v2()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with totals as (
  select
    count(*)::int total_unique_urls,
    count(*) filter(where decision='qualified_canonical_link')::int qualified_canonical_link,
    count(*) filter(where decision='qualified_internal_signal')::int qualified_internal_signal,
    count(*) filter(where decision like 'reserve_%')::int deferred_reserve,
    count(*) filter(where decision='already_seeded')::int already_seeded,
    count(*) filter(where serp_tail_eligible)::int serp_tail_eligible,
    count(*) filter(where serp_tail_eligible and effective_machine_gate<>'canonical_link_only')::int invalid_tail_gate,
    count(*) filter(where serp_tail_eligible and freshness_state not in ('current','due_soon'))::int invalid_tail_freshness,
    count(*) filter(where publication_eligible)::int publication_eligible,
    count(*) filter(where seed_admission_eligible)::int seed_admission_eligible
  from public.odm_b3_discovery_expansion_audit_v1
)
select jsonb_build_object(
  'audit_version','odm_b3_discovery_expansion_v2',
  'total_unique_urls',total_unique_urls,
  'qualified_net_new',qualified_canonical_link+qualified_internal_signal,
  'qualified_canonical_link',qualified_canonical_link,
  'qualified_internal_signal',qualified_internal_signal,
  'serp_tail_eligible',serp_tail_eligible,
  'deferred_reserve',deferred_reserve,
  'already_seeded',already_seeded,
  'publication_eligible',publication_eligible,
  'seed_admission_eligible',seed_admission_eligible,
  'integrity',jsonb_build_object(
    'invalid_tail_gate',invalid_tail_gate,
    'invalid_tail_freshness',invalid_tail_freshness
  ),
  'fail_closed',publication_eligible=0 and seed_admission_eligible=0 and invalid_tail_gate=0 and invalid_tail_freshness=0
)
from totals;
$$;

revoke all on function public.odm_b3_discovery_expansion_report_v2() from public,anon,authenticated;
grant execute on function public.odm_b3_discovery_expansion_report_v2() to service_role;

select public.odm_b3_discovery_expansion_report_v2();
