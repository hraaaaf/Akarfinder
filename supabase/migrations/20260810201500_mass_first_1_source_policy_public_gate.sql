-- MASS-FIRST-1 — Source Policy Public Gate
-- Public Search must never serve a source whose canonical Source Registry policy
-- is hidden, blocked, prohibited, permission-required, expired or missing.

create or replace function public.mass_first_source_public_allowed_v1(p_source_domain text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select
      r.no_bypass_required
      and r.display_gate is distinct from 'hidden'
      and r.display_policy in ('canonical_link_only','partner_content')
      and r.authorization_status not in ('prohibited','permission_required','unverified')
      and r.content_reuse_policy not in ('prohibited','permission_required','unknown')
      and r.detail_fetch_policy <> 'prohibited'
      and r.review_status in ('current','due_soon')
      and r.next_review_at > now()
      and r.machine_gate not like 'blocked%'
      and r.ingestion_gate <> 'blocked'
    from public.source_policy_registry r
    where r.source_domain = lower(nullif(btrim(p_source_domain),''))
  ), false);
$$;

revoke all on function public.mass_first_source_public_allowed_v1(text) from public;
grant execute on function public.mass_first_source_public_allowed_v1(text) to anon, authenticated, service_role;

create or replace function public.mass_first_1_source_policy_gate_report_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with observed as (
  select distinct lower(source_domain) source_domain
  from public.thin_index_search_documents
  where nullif(btrim(source_domain),'') is not null
), totals as (
  select
    count(*)::int as observed_sources,
    count(*) filter(where r.source_domain is null)::int as unregistered_sources,
    count(*) filter(where r.display_gate='hidden')::int as hidden_sources,
    count(*) filter(where r.authorization_status='prohibited' or r.content_reuse_policy='prohibited')::int as prohibited_sources,
    count(*) filter(where public.mass_first_source_public_allowed_v1(o.source_domain))::int as publicly_allowed_sources
  from observed o
  left join public.source_policy_registry r using(source_domain)
), leakage as (
  select count(*)::int as public_policy_leak_rows
  from public.thin_index_search_documents d
  where d.display_eligibility in ('eligible_primary','eligible_secondary')
    and not public.mass_first_source_public_allowed_v1(d.source_domain)
)
select jsonb_build_object(
  'version','mass_first_source_policy_gate_v1',
  'observed_sources',observed_sources,
  'unregistered_sources',unregistered_sources,
  'hidden_sources',hidden_sources,
  'prohibited_sources',prohibited_sources,
  'publicly_allowed_sources',publicly_allowed_sources,
  'pre_reclassification_policy_leak_rows',public_policy_leak_rows,
  'fail_closed',true
)
from totals cross join leakage;
$$;

revoke all on function public.mass_first_1_source_policy_gate_report_v1() from public, anon, authenticated;
grant execute on function public.mass_first_1_source_policy_gate_report_v1() to service_role;

comment on function public.mass_first_source_public_allowed_v1(text) is
  'Fail-closed public display gate derived only from canonical Source Registry policy. Missing, hidden, prohibited, permission-required, unverified or expired sources return false.';

select public.mass_first_1_source_policy_gate_report_v1();