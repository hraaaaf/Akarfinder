-- ODM-TYPED-ECONOMIC-CANDIDATES-V2
-- Extends the existing atomic observation envelope and value-level provenance.
-- Shadow-only: no listing, ranking, display eligibility or SERP mutation.

create or replace function public.odm_audit_economic_candidates_v2(
  p_text text,
  p_evidence_source text,
  p_observation_id text,
  p_observed_at timestamptz,
  p_field_path text
) returns jsonb
language sql
immutable
set search_path = ''
as $$
with matches as (
  select
    m[1] as raw_fragment,
    lower(coalesce(m[2],'')) as context_prefix,
    nullif(regexp_replace(m[3],'[^0-9]','','g'),'')::numeric as value_mad,
    upper(coalesce(m[4],'')) as currency_token,
    lower(coalesce(m[5],'')) as cadence_token,
    lower(coalesce(m[1],'')) as normalized_fragment
  from regexp_matches(
    coalesce(p_text,''),
    '(([^0-9]{0,48})([0-9]{1,3}(?:[ .,''’][0-9]{3})+|[0-9]{3,10})[[:space:]]*(mad|dhs?|dh)(?:[[:space:]]*(?:/|par)[[:space:]]*(m2|m²|mois|month|jour|day|semaine|week))?)',
    'gi'
  ) as m
), classified as (
  select
    *,
    case
      when cadence_token in ('m2','m²') then 'price_per_m2'
      when context_prefix ~ '(caution|d[ée]p[ôo]t[[:space:]]+de[[:space:]]+garantie|garantie)' then 'deposit'
      when context_prefix ~ '(charges?|syndic|frais[[:space:]]+mensuels?)' then 'charges'
      when context_prefix ~ '(frais[[:space:]]+d.agence|commission[[:space:]]+agence|honoraires)' then 'agency_fee'
      when context_prefix ~ '(ancien[[:space:]]+prix|prix[[:space:]]+barr[ée]|au[[:space:]]+lieu[[:space:]]+de)' then 'old_price'
      when context_prefix ~ '(prix[[:space:]]+promo|prix[[:space:]]+r[ée]duit|promotion|remise)' then 'discounted_price'
      when context_prefix ~ '(à[[:space:]]+partir[[:space:]]+de|a[[:space:]]+partir[[:space:]]+de|dès)' then 'starting_price'
      when cadence_token in ('jour','day') then 'rent_daily'
      when cadence_token in ('semaine','week') then 'rent_weekly'
      when cadence_token in ('mois','month') then 'rent_monthly'
      when lower(coalesce(p_text,'')) ~ '(par[[:space:]]+jour|/jour|daily)' then 'rent_daily'
      when lower(coalesce(p_text,'')) ~ '(par[[:space:]]+semaine|/semaine|weekly)' then 'rent_weekly'
      when lower(coalesce(p_text,'')) ~ '(loyer|location|à[[:space:]]+louer|a[[:space:]]+louer)' then 'rent_monthly'
      when lower(coalesce(p_text,'')) ~ '(vente|à[[:space:]]+vendre|a[[:space:]]+vendre)' then 'sale_total'
      else 'unknown_price'
    end as economic_type,
    lower(coalesce(p_text,'')) ~ '([0-9]{3,10}[[:space:]]*(mad|dhs?|dh)[[:space:]]*(à|a|-|jusqu.à)[[:space:]]*[0-9]{3,10}[[:space:]]*(mad|dhs?|dh)?)' as range_context
  from matches
  where value_mad between 100 and 1000000000
), annotated as (
  select
    *,
    case
      when range_context then 'price_range_requires_reconciliation'
      when economic_type='unknown_price' then 'economic_context_unconfirmed'
      when economic_type='old_price' then 'historical_price_not_publicable'
      when economic_type='starting_price' then 'starting_price_not_exact'
      when economic_type='price_per_m2' then 'unit_price_not_total_price'
      when economic_type in ('deposit','charges','agency_fee') then 'ancillary_amount_not_listing_price'
      else null
    end as rejection_reason,
    case
      when range_context then 0.35
      when economic_type in ('rent_monthly','rent_daily','rent_weekly') and cadence_token<>'' then 0.99
      when economic_type in ('deposit','charges','agency_fee','old_price','discounted_price','starting_price','price_per_m2') then 0.97
      when economic_type in ('sale_total','rent_monthly','rent_daily','rent_weekly') then 0.86
      else 0.35
    end as confidence
  from classified
), deduplicated as (
  select distinct on (value_mad,economic_type,raw_fragment)
    value_mad,economic_type,raw_fragment,normalized_fragment,currency_token,cadence_token,
    rejection_reason,confidence,range_context
  from annotated
  order by value_mad,economic_type,raw_fragment
)
select coalesce(jsonb_agg(jsonb_build_object(
  'candidate_id',md5(coalesce(p_observation_id,'')||':'||coalesce(p_field_path,'')||':'||economic_type||':'||value_mad::text||':'||raw_fragment),
  'value_mad',value_mad,
  'currency','MAD',
  'currency_token',currency_token,
  'economic_type',economic_type,
  'cadence_token',nullif(cadence_token,''),
  'evidence_source',nullif(btrim(p_evidence_source),''),
  'field_path',nullif(btrim(p_field_path),''),
  'observation_id',nullif(btrim(p_observation_id),''),
  'observed_at',p_observed_at,
  'raw_fragment',raw_fragment,
  'normalized_fragment',normalized_fragment,
  'parser_version','odm_economic_parser_v2',
  'confidence',confidence,
  'range_context',range_context,
  'rejection_reason',rejection_reason,
  'publication_eligible',false,
  'ranking_eligible',false
) order by value_mad,economic_type,raw_fragment),'[]'::jsonb)
from deduplicated;
$$;

create or replace view public.odm_audit_economic_validation_v2 as
with candidates as (
  select
    a.*,
    public.odm_audit_economic_candidates_v2(
      a.observation_title,'title',a.observation_id,a.observation_observed_at,
      case a.observation_source when 'public_index_result' then 'metadata.public_index_result.title' when 'serper_search' then 'metadata.serper_search.title' else 'thin_index.title' end
    ) as title_economic_candidates_v2,
    public.odm_audit_economic_candidates_v2(
      a.observation_snippet,'snippet',a.observation_id,a.observation_observed_at,
      case a.observation_source when 'public_index_result' then 'metadata.public_index_result.snippet' when 'serper_search' then 'metadata.serper_search.snippet' else 'thin_index.snippet' end
    ) as snippet_economic_candidates_v2
  from public.odm_audit_atomic_observation_v1 a
), selected as (
  select
    c.*,
    case when jsonb_array_length(title_economic_candidates_v2)>0 then title_economic_candidates_v2 else snippet_economic_candidates_v2 end as selected_economic_candidates_v2,
    case when jsonb_array_length(title_economic_candidates_v2)>0 then 'title' when jsonb_array_length(snippet_economic_candidates_v2)>0 then 'snippet' end as selected_evidence_source_v2
  from candidates c
), assessed as (
  select
    s.*,
    (select count(*) from jsonb_array_elements(selected_economic_candidates_v2) e where e->>'rejection_reason' is null) as publicable_candidate_count,
    (select count(*) from jsonb_array_elements(selected_economic_candidates_v2) e where e->>'economic_type' in ('sale_total','rent_monthly','rent_daily','rent_weekly','discounted_price') and e->>'rejection_reason' is null) as principal_candidate_count
  from selected s
)
select
  a.*,
  case
    when jsonb_array_length(selected_economic_candidates_v2)=0 then 'missing'
    when publicable_candidate_count=0 then 'rejected'
    when principal_candidate_count<>1 then 'ambiguous'
    when observation_observed_at is null then 'unconfirmed_timestamp'
    when seed_provider='commoncrawl_cdx' and freshness_status<>'fresh_confirmed' then 'archive_unconfirmed'
    else 'trusted_typed_candidate_v2'
  end as typed_price_status_v2,
  case
    when principal_candidate_count=1
      and observation_observed_at is not null
      and not (seed_provider='commoncrawl_cdx' and freshness_status<>'fresh_confirmed')
    then (select e from jsonb_array_elements(selected_economic_candidates_v2) e where e->>'economic_type' in ('sale_total','rent_monthly','rent_daily','rent_weekly','discounted_price') and e->>'rejection_reason' is null limit 1)
  end as shadow_selected_economic_candidate_v2
from assessed a;

create or replace function public.odm_audit_economic_parser_report_v2(
  p_sample_size integer default 240,
  p_sample_salt text default 'odm-economic-parser-v2'
) returns jsonb
language sql
stable
set search_path=''
as $$
with sampled as (
  select * from public.odm_audit_economic_validation_v2
  order by md5(seed_id::text||coalesce(p_sample_salt,''))
  limit least(greatest(coalesce(p_sample_size,240),1),2000)
)
select jsonb_build_object(
  'audit_version','odm_economic_parser_v2',
  'sample_size',count(*),
  'trusted_typed_candidates_v2',count(*) filter(where typed_price_status_v2='trusted_typed_candidate_v2'),
  'ambiguous_candidates_v2',count(*) filter(where typed_price_status_v2='ambiguous'),
  'rejected_candidates_v2',count(*) filter(where typed_price_status_v2='rejected'),
  'missing_candidates_v2',count(*) filter(where typed_price_status_v2='missing'),
  'typed_candidate_counts',jsonb_build_object(
    'sale_total',count(*) filter(where shadow_selected_economic_candidate_v2->>'economic_type'='sale_total'),
    'rent_monthly',count(*) filter(where shadow_selected_economic_candidate_v2->>'economic_type'='rent_monthly'),
    'rent_daily',count(*) filter(where shadow_selected_economic_candidate_v2->>'economic_type'='rent_daily'),
    'rent_weekly',count(*) filter(where shadow_selected_economic_candidate_v2->>'economic_type'='rent_weekly'),
    'discounted_price',count(*) filter(where shadow_selected_economic_candidate_v2->>'economic_type'='discounted_price')
  ),
  'gates',jsonb_build_object(
    'no_cross_observation_field_mixing',count(*) filter(where observation_id is null or observation_source is null)=0,
    'all_candidates_have_value_level_provenance',count(*) filter(where shadow_selected_economic_candidate_v2 is not null and (shadow_selected_economic_candidate_v2->>'candidate_id' is null or shadow_selected_economic_candidate_v2->>'field_path' is null or shadow_selected_economic_candidate_v2->>'observed_at' is null or shadow_selected_economic_candidate_v2->>'raw_fragment' is null or shadow_selected_economic_candidate_v2->>'parser_version'<>'odm_economic_parser_v2'))=0,
    'no_ancillary_amount_publication',count(*) filter(where shadow_selected_economic_candidate_v2->>'economic_type' in ('deposit','charges','agency_fee'))=0,
    'no_historical_or_unit_price_publication',count(*) filter(where shadow_selected_economic_candidate_v2->>'economic_type' in ('old_price','starting_price','price_per_m2','unknown_price'))=0,
    'no_range_publication',count(*) filter(where shadow_selected_economic_candidate_v2->>'range_context'='true')=0,
    'ranking_remains_disabled',count(*) filter(where shadow_selected_economic_candidate_v2->>'ranking_eligible'='true')=0,
    'publication_remains_disabled',count(*) filter(where shadow_selected_economic_candidate_v2->>'publication_eligible'='true')=0
  )
)
from sampled;
$$;

revoke all on function public.odm_audit_economic_candidates_v2(text,text,text,timestamptz,text) from public,anon,authenticated;
revoke all on function public.odm_audit_economic_parser_report_v2(integer,text) from public,anon,authenticated;
revoke all on public.odm_audit_economic_validation_v2 from public,anon,authenticated;
grant execute on function public.odm_audit_economic_parser_report_v2(integer,text) to service_role;
grant select on public.odm_audit_economic_validation_v2 to service_role;

comment on function public.odm_audit_economic_candidates_v2(text,text,text,timestamptz,text) is 'Shadow-only typed economic candidates V2 with value-level provenance and fail-closed ancillary/range handling.';
comment on view public.odm_audit_economic_validation_v2 is 'Shadow-only V2 reconciliation over the atomic observation envelope. No candidate is ranking or publication eligible.';