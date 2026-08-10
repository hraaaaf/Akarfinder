-- MASS-FIRST-5 — Mass Reclassification & Certification
-- Snapshot the pre-change public policy, run one idempotent deterministic
-- recomputation, then fail the migration if any policy leak remains.

create table if not exists public.mass_first_reclassification_audit_v1 (
  seed_id uuid primary key,
  source_domain text,
  document_kind text,
  quality_tier text,
  quality_score smallint,
  old_display_eligibility text,
  old_display_reason text,
  source_public_allowed boolean not null,
  structurally_listing_eligible boolean not null,
  captured_at timestamptz not null default now()
);

truncate table public.mass_first_reclassification_audit_v1;

insert into public.mass_first_reclassification_audit_v1 (
  seed_id,source_domain,document_kind,quality_tier,quality_score,
  old_display_eligibility,old_display_reason,source_public_allowed,structurally_listing_eligible
)
select
  d.seed_id,d.source_domain,d.document_kind,d.quality_tier,d.quality_score,
  d.display_eligibility,d.display_eligibility_reason,
  public.mass_first_source_public_allowed_v1(d.source_domain),
  (
    d.document_kind='LISTING'
    and d.vertical_classification='real_estate_likely'
    and nullif(btrim(d.canonical_url),'') is not null
    and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
    and d.freshness_status in ('seed_only','fresh_confirmed')
  )
from public.thin_index_search_documents d;

-- Naming the watched columns fires both MASS-FIRST triggers without altering
-- source facts. Re-running remains deterministic.
update public.thin_index_search_documents
set source_domain=source_domain,
    title=title;

alter table public.mass_first_reclassification_audit_v1 enable row level security;
revoke all on table public.mass_first_reclassification_audit_v1 from public,anon,authenticated;
grant select on table public.mass_first_reclassification_audit_v1 to service_role;

create or replace function public.mass_first_5_certification_report_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with transitions as (
  select
    count(*)::int as audited_rows,
    count(*) filter(
      where a.structurally_listing_eligible
        and a.source_public_allowed
        and a.old_display_eligibility='ineligible'
        and d.display_eligibility in ('eligible_primary','eligible_secondary')
    )::int as recovered_structural_listings,
    count(*) filter(
      where a.structurally_listing_eligible
        and a.source_public_allowed
        and (a.quality_tier is null or a.old_display_reason='missing_quality_tier')
        and d.display_eligibility='ineligible'
    )::int as quality_only_exclusions_remaining,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and not public.mass_first_source_public_allowed_v1(d.source_domain)
    )::int as source_policy_leak_rows,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and d.document_kind<>'LISTING'
    )::int as non_listing_public_rows,
    count(*) filter(where d.listing_power_score is null)::int as unscored_rows,
    count(*) filter(where d.listing_power_score<0 or d.listing_power_score>100)::int as out_of_bounds_scores,
    count(*) filter(where d.ranking_policy_version='mass-first-v1')::int as mass_first_policy_rows
  from public.mass_first_reclassification_audit_v1 a
  join public.thin_index_search_documents d using(seed_id)
), search_surface as (
  select
    count(*) filter(
      where d.document_kind='LISTING'
        and d.vertical_classification='real_estate_likely'
        and d.display_eligibility in ('eligible_primary','eligible_secondary')
        and public.mass_first_source_public_allowed_v1(d.source_domain)
    )::int as eligible_search_rows
  from public.thin_index_search_documents d
)
select jsonb_build_object(
  'version','mass-first-v1',
  'audited_rows',audited_rows,
  'recovered_structural_listings',recovered_structural_listings,
  'eligible_search_rows',eligible_search_rows,
  'quality_only_exclusions_remaining',quality_only_exclusions_remaining,
  'source_policy_leak_rows',source_policy_leak_rows,
  'non_listing_public_rows',non_listing_public_rows,
  'unscored_rows',unscored_rows,
  'out_of_bounds_scores',out_of_bounds_scores,
  'mass_first_policy_rows',mass_first_policy_rows,
  'certified',
    quality_only_exclusions_remaining=0
    and source_policy_leak_rows=0
    and non_listing_public_rows=0
    and unscored_rows=0
    and out_of_bounds_scores=0
)
from transitions cross join search_surface;
$$;

revoke all on function public.mass_first_5_certification_report_v1() from public,anon,authenticated;
grant execute on function public.mass_first_5_certification_report_v1() to service_role;

do $$
declare
  v_report jsonb;
begin
  select public.mass_first_5_certification_report_v1() into v_report;
  if coalesce((v_report->>'certified')::boolean,false) is distinct from true then
    raise exception 'MASS-FIRST certification failed: %',v_report;
  end if;
end
$$;

select public.mass_first_5_certification_report_v1();