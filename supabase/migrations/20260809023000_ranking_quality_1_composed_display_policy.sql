-- RANKING-QUALITY-1
-- Reconcile persisted ODM-06 display/ranking quality policy with downstream
-- document-kind and provider-detail precision overrides.
--
-- Scope:
--   * no Ranking V2 score/search-gateway change;
--   * no acquisition/source change;
--   * no new public data extraction;
--   * idempotent repair of persisted display eligibility/reason/quality boost;
--   * future writes recompute when vertical/document-kind state changes.

create or replace function public.odm06_set_display_policy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base_eligibility text;
  v_base_reason text;
  v_base_boost real;
  v_detail_precision boolean;
begin
  v_base_eligibility := public.odm06_display_eligibility(
    new.canonical_url,
    new.seed_provider,
    new.freshness_status,
    new.quality_tier
  );
  v_base_reason := public.odm06_display_eligibility_reason(
    new.canonical_url,
    new.seed_provider,
    new.freshness_status,
    new.quality_tier
  );
  v_base_boost := public.odm06_ranking_quality_boost(
    new.quality_tier,
    new.quality_score,
    new.freshness_status
  );

  v_detail_precision := new.document_kind_version in (
    'odm_agenz_detail_precision_v1',
    'odm_avito_detail_precision_v1',
    'odm_masaken_detail_precision_v1',
    'odm_mouldar_detail_precision_v1',
    'odm_mubawab_detail_geo_precision_v1'
  );

  -- Vertical purity is the strongest invariant. Only positively classified
  -- real-estate rows may reach document-kind or provider-detail policy.
  if new.vertical_classification is distinct from 'real_estate_likely' then
    new.display_eligibility := 'ineligible';
    new.display_eligibility_reason := 'vertical_not_real_estate';
    new.ranking_quality_boost := 0;
    new.ranking_policy_version := coalesce(new.ranking_policy_version, 'odm06-v1');

  -- Category pages are never listing candidates.
  elsif new.document_kind = 'CATEGORY' then
    new.display_eligibility := 'ineligible';
    new.display_eligibility_reason := 'category_page_not_listing';
    new.ranking_quality_boost := 0;
    new.ranking_policy_version := 'odm_document_kind_v1';

  -- Ambiguous real-estate documents keep the historical secondary/capped policy,
  -- except when the base ODM-06 policy already blocks them more strongly.
  elsif new.document_kind = 'AMBIGUOUS' then
    if v_base_eligibility = 'ineligible' then
      new.display_eligibility := v_base_eligibility;
      new.display_eligibility_reason := v_base_reason;
      new.ranking_quality_boost := v_base_boost;
    else
      new.display_eligibility := 'eligible_secondary';
      new.display_eligibility_reason := 'ambiguous_property_result';
      new.ranking_quality_boost := least(v_base_boost, 0.05::real);
    end if;
    new.ranking_policy_version := 'odm_document_kind_v1';

  -- Explicit provider-detail precision is a deliberate LISTING promotion.
  -- Preserve its secondary fallback when base quality alone would block the row;
  -- otherwise LISTING rows use the current ODM-06 quality policy normally.
  elsif new.document_kind = 'LISTING' and v_detail_precision then
    if v_base_eligibility = 'ineligible' then
      new.display_eligibility := 'eligible_secondary';
      new.display_eligibility_reason := 'provider_detail_listing';
      new.ranking_quality_boost := v_base_boost;
    else
      new.display_eligibility := v_base_eligibility;
      new.display_eligibility_reason := v_base_reason;
      new.ranking_quality_boost := v_base_boost;
    end if;
    new.ranking_policy_version := new.document_kind_version;

  -- Normal LISTING / unclassified documents follow ODM-06 directly.
  else
    new.display_eligibility := v_base_eligibility;
    new.display_eligibility_reason := v_base_reason;
    new.ranking_quality_boost := v_base_boost;
    new.ranking_policy_version := 'odm06-v1';
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_thin_index_display_policy_write
  on public.thin_index_search_documents;

create trigger zzz_thin_index_display_policy_write
before insert or update of
  canonical_url,
  seed_provider,
  freshness_status,
  quality_tier,
  quality_score,
  vertical_classification,
  document_kind,
  document_kind_version
on public.thin_index_search_documents
for each row
execute function public.odm06_set_display_policy();

-- Repair only rows whose persisted public policy differs from the composed policy.
-- The WHERE clause makes the backfill idempotent and avoids version-only rewrites.
with base as (
  select
    d.seed_id,
    d.vertical_classification,
    d.document_kind,
    d.document_kind_version,
    d.ranking_policy_version,
    d.display_eligibility,
    d.display_eligibility_reason,
    d.ranking_quality_boost,
    public.odm06_display_eligibility(
      d.canonical_url,
      d.seed_provider,
      d.freshness_status,
      d.quality_tier
    ) as base_eligibility,
    public.odm06_display_eligibility_reason(
      d.canonical_url,
      d.seed_provider,
      d.freshness_status,
      d.quality_tier
    ) as base_reason,
    public.odm06_ranking_quality_boost(
      d.quality_tier,
      d.quality_score,
      d.freshness_status
    ) as base_boost,
    d.document_kind_version in (
      'odm_agenz_detail_precision_v1',
      'odm_avito_detail_precision_v1',
      'odm_masaken_detail_precision_v1',
      'odm_mouldar_detail_precision_v1',
      'odm_mubawab_detail_geo_precision_v1'
    ) as is_detail_precision
  from public.thin_index_search_documents d
), expected as (
  select
    seed_id,
    case
      when vertical_classification is distinct from 'real_estate_likely' then 'ineligible'
      when document_kind = 'CATEGORY' then 'ineligible'
      when document_kind = 'AMBIGUOUS' and base_eligibility <> 'ineligible'
        then 'eligible_secondary'
      when document_kind = 'LISTING' and is_detail_precision and base_eligibility = 'ineligible'
        then 'eligible_secondary'
      else base_eligibility
    end as expected_eligibility,
    case
      when vertical_classification is distinct from 'real_estate_likely' then 'vertical_not_real_estate'
      when document_kind = 'CATEGORY' then 'category_page_not_listing'
      when document_kind = 'AMBIGUOUS' and base_eligibility <> 'ineligible'
        then 'ambiguous_property_result'
      when document_kind = 'LISTING' and is_detail_precision and base_eligibility = 'ineligible'
        then 'provider_detail_listing'
      else base_reason
    end as expected_reason,
    case
      when vertical_classification is distinct from 'real_estate_likely' then 0::real
      when document_kind = 'CATEGORY' then 0::real
      when document_kind = 'AMBIGUOUS' and base_eligibility <> 'ineligible'
        then least(base_boost, 0.05::real)
      else base_boost
    end as expected_boost,
    case
      when vertical_classification is distinct from 'real_estate_likely'
        then coalesce(ranking_policy_version, 'odm06-v1')
      when document_kind in ('CATEGORY', 'AMBIGUOUS')
        then 'odm_document_kind_v1'
      when document_kind = 'LISTING' and is_detail_precision
        then document_kind_version
      else 'odm06-v1'
    end as expected_policy_version
  from base
)
update public.thin_index_search_documents d
set
  display_eligibility = e.expected_eligibility,
  display_eligibility_reason = e.expected_reason,
  ranking_quality_boost = e.expected_boost,
  ranking_policy_version = e.expected_policy_version
from expected e
where d.seed_id = e.seed_id
  and (
    d.display_eligibility is distinct from e.expected_eligibility
    or d.display_eligibility_reason is distinct from e.expected_reason
    or d.ranking_quality_boost is distinct from e.expected_boost
  );

create or replace function public.odm_ranking_quality_1_report_v1()
returns jsonb
language sql
stable
set search_path = ''
as $$
with base as (
  select
    d.*,
    public.odm06_display_eligibility(
      d.canonical_url,
      d.seed_provider,
      d.freshness_status,
      d.quality_tier
    ) as base_eligibility,
    public.odm06_display_eligibility_reason(
      d.canonical_url,
      d.seed_provider,
      d.freshness_status,
      d.quality_tier
    ) as base_reason,
    public.odm06_ranking_quality_boost(
      d.quality_tier,
      d.quality_score,
      d.freshness_status
    ) as base_boost,
    d.document_kind_version in (
      'odm_agenz_detail_precision_v1',
      'odm_avito_detail_precision_v1',
      'odm_masaken_detail_precision_v1',
      'odm_mouldar_detail_precision_v1',
      'odm_mubawab_detail_geo_precision_v1'
    ) as is_detail_precision
  from public.thin_index_search_documents d
), expected as (
  select
    base.*,
    case
      when vertical_classification is distinct from 'real_estate_likely' then 'ineligible'
      when document_kind = 'CATEGORY' then 'ineligible'
      when document_kind = 'AMBIGUOUS' and base_eligibility <> 'ineligible'
        then 'eligible_secondary'
      when document_kind = 'LISTING' and is_detail_precision and base_eligibility = 'ineligible'
        then 'eligible_secondary'
      else base_eligibility
    end as expected_eligibility,
    case
      when vertical_classification is distinct from 'real_estate_likely' then 'vertical_not_real_estate'
      when document_kind = 'CATEGORY' then 'category_page_not_listing'
      when document_kind = 'AMBIGUOUS' and base_eligibility <> 'ineligible'
        then 'ambiguous_property_result'
      when document_kind = 'LISTING' and is_detail_precision and base_eligibility = 'ineligible'
        then 'provider_detail_listing'
      else base_reason
    end as expected_reason,
    case
      when vertical_classification is distinct from 'real_estate_likely' then 0::real
      when document_kind = 'CATEGORY' then 0::real
      when document_kind = 'AMBIGUOUS' and base_eligibility <> 'ineligible'
        then least(base_boost, 0.05::real)
      else base_boost
    end as expected_boost
  from base
), totals as (
  select
    count(*)::int as total_rows,
    count(*) filter (
      where display_eligibility is distinct from expected_eligibility
         or display_eligibility_reason is distinct from expected_reason
         or ranking_quality_boost is distinct from expected_boost
    )::int as policy_drift_rows,
    count(*) filter (
      where vertical_classification is distinct from 'real_estate_likely'
        and display_eligibility is distinct from 'ineligible'
    )::int as non_real_estate_or_unknown_public_rows,
    count(*) filter (
      where document_kind = 'CATEGORY'
        and display_eligibility is distinct from 'ineligible'
    )::int as category_public_rows,
    count(*) filter (
      where document_kind = 'AMBIGUOUS'
        and display_eligibility = 'eligible_primary'
    )::int as ambiguous_primary_rows,
    count(*) filter (
      where document_kind = 'LISTING'
        and display_eligibility_reason = 'ambiguous_property_result'
    )::int as listing_with_ambiguous_policy_rows,
    count(*) filter (
      where document_kind = 'LISTING'
        and is_detail_precision
        and base_eligibility = 'ineligible'
        and display_eligibility = 'eligible_secondary'
        and display_eligibility_reason = 'provider_detail_listing'
    )::int as detail_fallback_rows
  from expected
)
select jsonb_build_object(
  'version', 'ranking-quality-1',
  'total_rows', total_rows,
  'policy_drift_rows', policy_drift_rows,
  'non_real_estate_or_unknown_public_rows', non_real_estate_or_unknown_public_rows,
  'category_public_rows', category_public_rows,
  'ambiguous_primary_rows', ambiguous_primary_rows,
  'listing_with_ambiguous_policy_rows', listing_with_ambiguous_policy_rows,
  'detail_fallback_rows', detail_fallback_rows,
  'ranking_v2_changed', false,
  'acquisition_changed', false
)
from totals;
$$;

revoke all on function public.odm_ranking_quality_1_report_v1() from public;
revoke all on function public.odm_ranking_quality_1_report_v1() from anon;
revoke all on function public.odm_ranking_quality_1_report_v1() from authenticated;
grant execute on function public.odm_ranking_quality_1_report_v1() to service_role;
