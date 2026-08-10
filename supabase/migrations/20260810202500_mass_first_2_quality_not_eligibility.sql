-- MASS-FIRST-2 — Quality != Eligibility
-- Eligibility is structural/policy based. Missing or weak quality signals may
-- lower ranking, but must not by themselves suppress an otherwise valid LISTING.

create or replace function public.odm06_display_eligibility(
  p_canonical_url text,
  p_seed_provider text,
  p_freshness_status text,
  p_quality_tier text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'ineligible'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search') then 'ineligible'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'ineligible'
    else 'eligible_primary'
  end;
$$;

create or replace function public.odm06_display_eligibility_reason(
  p_canonical_url text,
  p_seed_provider text,
  p_freshness_status text,
  p_quality_tier text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'missing_canonical_url'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search') then 'unsupported_provider'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'unsupported_freshness_state'
    else 'structurally_eligible'
  end;
$$;

create or replace function public.odm06_set_display_policy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_base_eligibility text;
  v_base_reason text;
  v_base_boost real;
begin
  v_base_eligibility := public.odm06_display_eligibility(
    new.canonical_url,new.seed_provider,new.freshness_status,new.quality_tier
  );
  v_base_reason := public.odm06_display_eligibility_reason(
    new.canonical_url,new.seed_provider,new.freshness_status,new.quality_tier
  );
  v_base_boost := public.odm06_ranking_quality_boost(
    new.quality_tier,new.quality_score,new.freshness_status
  );

  new.ranking_quality_boost := v_base_boost;

  if not public.mass_first_source_public_allowed_v1(new.source_domain) then
    new.display_eligibility := 'ineligible';
    new.display_eligibility_reason := 'source_policy_not_public';
    new.ranking_policy_version := 'mass-first-v1';
  elsif new.vertical_classification is distinct from 'real_estate_likely' then
    new.display_eligibility := 'ineligible';
    new.display_eligibility_reason := 'vertical_not_real_estate';
    new.ranking_policy_version := 'mass-first-v1';
  elsif new.document_kind = 'CATEGORY' then
    new.display_eligibility := 'ineligible';
    new.display_eligibility_reason := 'category_page_not_listing';
    new.ranking_policy_version := 'mass-first-v1';
  elsif v_base_eligibility = 'ineligible' then
    new.display_eligibility := v_base_eligibility;
    new.display_eligibility_reason := v_base_reason;
    new.ranking_policy_version := 'mass-first-v1';
  elsif new.document_kind = 'AMBIGUOUS' then
    new.display_eligibility := 'eligible_secondary';
    new.display_eligibility_reason := 'ambiguous_property_result';
    new.ranking_policy_version := 'mass-first-v1';
  else
    new.display_eligibility := 'eligible_primary';
    new.display_eligibility_reason := 'listing_policy_eligible';
    new.ranking_policy_version := 'mass-first-v1';
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_thin_index_display_policy_write on public.thin_index_search_documents;
create trigger zzz_thin_index_display_policy_write
before insert or update of
  canonical_url,source_domain,seed_provider,freshness_status,quality_tier,quality_score,
  vertical_classification,document_kind,document_kind_version
on public.thin_index_search_documents
for each row execute function public.odm06_set_display_policy();

create or replace function public.mass_first_2_quality_eligibility_contract_report_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with candidates as (
  select d.*
  from public.thin_index_search_documents d
  where d.document_kind='LISTING'
    and d.vertical_classification='real_estate_likely'
    and nullif(btrim(d.canonical_url),'') is not null
    and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
    and d.freshness_status in ('seed_only','fresh_confirmed')
    and public.mass_first_source_public_allowed_v1(d.source_domain)
), totals as (
  select
    count(*)::int as structurally_eligible_listings,
    count(*) filter(where quality_tier is null or quality_tier not in ('Q0_link_only','Q1_contextual','Q2_comparable','Q3_intelligence_ready'))::int as unscored_or_unknown_quality_listings,
    count(*) filter(where quality_tier in ('Q0_link_only','Q1_contextual'))::int as low_quality_listings
  from candidates
)
select jsonb_build_object(
  'version','mass_first_quality_not_eligibility_v1',
  'structurally_eligible_listings',structurally_eligible_listings,
  'unscored_or_unknown_quality_listings',unscored_or_unknown_quality_listings,
  'low_quality_listings',low_quality_listings,
  'quality_used_as_hard_eligibility_gate',false,
  'quality_retained_for_ranking',true
)
from totals;
$$;

revoke all on function public.mass_first_2_quality_eligibility_contract_report_v1() from public,anon,authenticated;
grant execute on function public.mass_first_2_quality_eligibility_contract_report_v1() to service_role;

select public.mass_first_2_quality_eligibility_contract_report_v1();