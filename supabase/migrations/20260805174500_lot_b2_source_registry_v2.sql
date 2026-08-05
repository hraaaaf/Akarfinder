-- LOT B2 — Source Registry v2.
-- Machine-readable, fail-closed source governance without weakening existing decisions.

alter table public.source_policy_registry
  add column if not exists policy_version text not null default 'source_registry_v2',
  add column if not exists authorization_status text not null default 'unverified',
  add column if not exists acquisition_mode text not null default 'blocked',
  add column if not exists allowed_discovery_channels text[] not null default '{}'::text[],
  add column if not exists max_revalidation_interval_days integer not null default 14,
  add column if not exists review_status text not null default 'due',
  add column if not exists policy_effective_at timestamptz,
  add column if not exists policy_expires_at timestamptz,
  add column if not exists evidence_observed_at timestamptz,
  add column if not exists robots_observed_at timestamptz,
  add column if not exists terms_observed_at timestamptz,
  add column if not exists contact_status text not null default 'not_started',
  add column if not exists machine_gate text not null default 'blocked_unverified',
  add column if not exists policy_hash text;

insert into public.source_policy_registry (
  source_domain,source_name,current_representation_count,
  discovery_policy,detail_fetch_policy,content_reuse_policy,display_policy,
  robots_status,terms_status,partnership_required,legal_review_required,no_bypass_required,
  evidence_urls,evidence_summary,primary_geography,
  volume_score,diversification_score,structure_score,policy_confidence_score,freshness_score,
  recommended_action,reviewed_at,next_review_at
)
select
  'marrakechrealty.com','Marrakech Realty',count(*),
  'public_index_only','legal_review_required','unknown','internal_signal_only',
  'unverified','unverified',true,true,true,
  array['https://marrakechrealty.com/'],
  'Observed in the search corpus, but no verified robots, terms, permission or partnership evidence is recorded.',
  'Marrakech',1,8,6,0,1,
  'Keep all observations internal. Complete robots, terms and authorization review before any acquisition or public representation.',
  now(),now()
from public.thin_index_search_documents
where lower(source_domain)='marrakechrealty.com'
on conflict (source_domain) do nothing;

update public.source_policy_registry
set
  authorization_status = case
    when content_reuse_policy='prohibited' then 'prohibited'
    when content_reuse_policy='permission_required' or detail_fetch_policy='permission_required' then 'permission_required'
    when content_reuse_policy='unknown' then 'unverified'
    else 'limited_public_facts'
  end,
  acquisition_mode = case
    when discovery_policy='public_sitemap_only' and display_policy='canonical_link_only' then 'public_sitemap_canonical_link'
    when discovery_policy='public_index_only' then 'public_index_internal_only'
    else 'blocked'
  end,
  allowed_discovery_channels = case
    when discovery_policy='public_sitemap_only' then array['public_sitemap']::text[]
    when discovery_policy='public_index_only' then array['public_index','commoncrawl']::text[]
    else '{}'::text[]
  end,
  review_status = case
    when next_review_at < now() then 'overdue'
    when next_review_at <= now()+interval '7 days' then 'due_soon'
    else 'current'
  end,
  policy_effective_at = coalesce(policy_effective_at,reviewed_at),
  policy_expires_at = coalesce(policy_expires_at,next_review_at),
  evidence_observed_at = coalesce(evidence_observed_at,reviewed_at),
  robots_observed_at = case when robots_status<>'unverified' then coalesce(robots_observed_at,reviewed_at) else robots_observed_at end,
  terms_observed_at = case when terms_status not in ('unverified','not_found') then coalesce(terms_observed_at,reviewed_at) else terms_observed_at end,
  contact_status = case when partnership_required then 'required' else 'not_required' end,
  machine_gate = case
    when no_bypass_required=false then 'blocked_invalid_no_bypass'
    when next_review_at < now() then 'blocked_review_overdue'
    when content_reuse_policy='prohibited' then 'internal_signal_only'
    when display_policy='canonical_link_only' and discovery_policy='public_sitemap_only' then 'canonical_link_only'
    when display_policy='internal_signal_only' then 'internal_signal_only'
    else 'blocked_unverified'
  end,
  policy_hash = md5(concat_ws('|',source_domain,discovery_policy,detail_fetch_policy,content_reuse_policy,display_policy,robots_status,terms_status,reviewed_at::text,next_review_at::text)),
  updated_at=now();

alter table public.source_policy_registry
  drop constraint if exists source_policy_registry_authorization_status_check,
  add constraint source_policy_registry_authorization_status_check check (authorization_status in ('unverified','permission_required','prohibited','limited_public_facts','authorized_partner')),
  drop constraint if exists source_policy_registry_acquisition_mode_check,
  add constraint source_policy_registry_acquisition_mode_check check (acquisition_mode in ('blocked','public_index_internal_only','public_sitemap_canonical_link','authorized_detail_feed','partner_feed')),
  drop constraint if exists source_policy_registry_review_status_check,
  add constraint source_policy_registry_review_status_check check (review_status in ('current','due_soon','overdue','due')),
  drop constraint if exists source_policy_registry_machine_gate_check,
  add constraint source_policy_registry_machine_gate_check check (machine_gate in ('blocked_unverified','blocked_review_overdue','blocked_invalid_no_bypass','internal_signal_only','canonical_link_only','authorized_detail_feed','partner_feed')),
  drop constraint if exists source_policy_registry_revalidation_days_check,
  add constraint source_policy_registry_revalidation_days_check check (max_revalidation_interval_days between 1 and 90);

alter table public.source_policy_registry enable row level security;
revoke all on table public.source_policy_registry from public,anon,authenticated;
grant select,insert,update,delete on table public.source_policy_registry to service_role;

create or replace function public.odm_b2_source_registry_v2_report()
returns jsonb language sql stable security invoker set search_path='' as $$
with observed as (
  select distinct lower(source_domain) source_domain
  from public.thin_index_search_documents
  where nullif(btrim(source_domain),'') is not null
), totals as (
  select count(*)::int registered,
    count(*) filter(where machine_gate='canonical_link_only')::int canonical_link_only,
    count(*) filter(where machine_gate='internal_signal_only')::int internal_signal_only,
    count(*) filter(where machine_gate like 'blocked%')::int blocked,
    count(*) filter(where review_status='overdue')::int overdue,
    count(*) filter(where cardinality(allowed_discovery_channels)=0)::int no_channel,
    count(*) filter(where policy_hash is null)::int missing_hash,
    count(*) filter(where no_bypass_required=false)::int invalid_no_bypass
  from public.source_policy_registry
), coverage as (
  select count(*)::int observed_domains,
    count(*) filter(where r.source_domain is not null)::int registered_observed,
    count(*) filter(where r.source_domain is null)::int unregistered_observed
  from observed o left join public.source_policy_registry r using(source_domain)
)
select jsonb_build_object(
  'policy_version','source_registry_v2',
  'registered_sources',totals.registered,
  'observed_domains',coverage.observed_domains,
  'registered_observed_domains',coverage.registered_observed,
  'unregistered_observed_domains',coverage.unregistered_observed,
  'machine_gates',jsonb_build_object('canonical_link_only',totals.canonical_link_only,'internal_signal_only',totals.internal_signal_only,'blocked',totals.blocked),
  'review',jsonb_build_object('overdue',totals.overdue),
  'integrity',jsonb_build_object('sources_without_channel',totals.no_channel,'missing_policy_hash',totals.missing_hash,'invalid_no_bypass',totals.invalid_no_bypass),
  'fail_closed',coverage.unregistered_observed=0 and totals.missing_hash=0 and totals.invalid_no_bypass=0
)
from totals cross join coverage;$$;

revoke all on function public.odm_b2_source_registry_v2_report() from public,anon,authenticated;
grant execute on function public.odm_b2_source_registry_v2_report() to service_role;

select public.odm_b2_source_registry_v2_report();
