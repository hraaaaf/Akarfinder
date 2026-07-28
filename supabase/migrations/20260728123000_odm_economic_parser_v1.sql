-- ODM-ECONOMIC-PARSER-01 — typed, provenance-preserving economic evidence.
-- Shadow-only and reversible: no persisted listing, ranking, eligibility, or SERP row is mutated.

create or replace function public.odm_audit_economic_candidates_v1(
  p_text text,
  p_evidence_source text,
  p_observation_id text
) returns jsonb
language sql
immutable
set search_path = ''
as $$
with matches as (
  select
    m[1] as raw_fragment,
    nullif(regexp_replace(m[2], '[^0-9]', '', 'g'), '')::numeric as value_mad,
    lower(coalesce(m[3], '')) as currency_token,
    lower(coalesce(m[4], '')) as cadence_token,
    lower(coalesce(m[1], '')) as normalized_fragment
  from regexp_matches(
    coalesce(p_text, ''),
    '((?:ancien[[:space:]]+prix|prix[[:space:]]+barr[ée]|au[[:space:]]+lieu[[:space:]]+de|à[[:space:]]+partir[[:space:]]+de|a[[:space:]]+partir[[:space:]]+de|dès|des)?[[:space:]]*([0-9]{1,3}(?:[ .,''’,-][0-9]{3})+|[0-9]{4,10})[[:space:]]*(mad|dhs?|dh)(?:[[:space:]]*(?:/|par)[[:space:]]*(m2|m²|mois|month|jour|day|semaine|week))?)',
    'gi'
  ) as m
), classified as (
  select
    *,
    case
      when cadence_token in ('m2','m²') then 'price_per_m2'
      when cadence_token in ('mois','month') then 'rent_monthly'
      when cadence_token in ('jour','day') then 'rent_daily'
      when cadence_token in ('semaine','week') then 'rent_weekly'
      when normalized_fragment ~ '(ancien[[:space:]]+prix|prix[[:space:]]+barr[ée]|au[[:space:]]+lieu[[:space:]]+de)' then 'old_price'
      when normalized_fragment ~ '(à[[:space:]]+partir[[:space:]]+de|a[[:space:]]+partir[[:space:]]+de|dès|des)' then 'starting_price'
      when lower(coalesce(p_text,'')) ~ '(loyer|location|à[[:space:]]+louer|a[[:space:]]+louer)' then 'rent_monthly'
      when lower(coalesce(p_text,'')) ~ '(vente|à[[:space:]]+vendre|a[[:space:]]+vendre)' then 'sale_total'
      else 'unknown_price'
    end as economic_type
  from matches
  where value_mad between 500 and 1000000000
), annotated as (
  select
    *,
    case
      when economic_type = 'unknown_price' then 'economic_context_unconfirmed'
      when economic_type = 'old_price' then 'historical_price_not_publicable'
      when economic_type = 'starting_price' then 'starting_price_not_exact'
      when economic_type = 'price_per_m2' then 'unit_price_not_total_price'
      else null
    end as rejection_reason,
    case
      when economic_type in ('rent_monthly','rent_daily','rent_weekly') and cadence_token <> '' then 0.98
      when economic_type = 'price_per_m2' then 0.98
      when economic_type in ('old_price','starting_price') then 0.95
      when economic_type in ('sale_total','rent_monthly') then 0.82
      else 0.40
    end as confidence
  from classified
), deduplicated as (
  select distinct on (value_mad,economic_type,raw_fragment)
    value_mad,economic_type,raw_fragment,normalized_fragment,rejection_reason,confidence
  from annotated
  order by value_mad,economic_type,raw_fragment
)
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'value_mad', value_mad,
      'currency', 'MAD',
      'economic_type', economic_type,
      'evidence_source', nullif(btrim(p_evidence_source), ''),
      'observation_id', nullif(btrim(p_observation_id), ''),
      'raw_fragment', raw_fragment,
      'normalized_fragment', normalized_fragment,
      'parser_version', 'odm_economic_parser_v1',
      'confidence', confidence,
      'rejection_reason', rejection_reason
    ) order by value_mad,economic_type,raw_fragment
  ),
  '[]'::jsonb
)
from deduplicated;
$$;

create or replace view public.odm_audit_atomic_observation_v1 as
with selected as (
  select
    d.seed_id,
    d.canonical_url,
    d.source_domain,
    d.seed_provider,
    d.freshness_status,
    d.quality_tier,
    d.quality_score,
    d.vertical_classification,
    d.normalized_price_mad as persisted_price_mad,
    d.normalized_surface_m2 as persisted_surface_m2,
    r.discovery_policy,
    r.display_policy,
    r.no_bypass_required,
    case
      when jsonb_typeof(s.metadata -> 'public_index_result') = 'object'
        and coalesce(s.metadata #>> '{public_index_result,title}', s.metadata #>> '{public_index_result,snippet}') is not null
        then 'public_index_result'
      when jsonb_typeof(s.metadata -> 'serper_search') = 'object'
        and coalesce(s.metadata #>> '{serper_search,title}', s.metadata #>> '{serper_search,snippet}') is not null
        then 'serper_search'
      else 'thin_index'
    end as observation_source,
    s.metadata,
    d.title as indexed_title,
    d.snippet as indexed_snippet,
    s.fresh_last_seen_at,
    s.last_observed_at
  from public.thin_index_search_documents d
  join public.source_offer_seeds s on s.id = d.seed_id
  left join public.source_policy_registry r on r.source_domain = d.source_domain
  where d.vertical_classification = 'real_estate_likely'
)
select
  x.*,
  case x.observation_source
    when 'public_index_result' then nullif(btrim(x.metadata #>> '{public_index_result,title}'), '')
    when 'serper_search' then nullif(btrim(x.metadata #>> '{serper_search,title}'), '')
    else nullif(btrim(x.indexed_title), '')
  end as observation_title,
  case x.observation_source
    when 'public_index_result' then nullif(btrim(x.metadata #>> '{public_index_result,snippet}'), '')
    when 'serper_search' then nullif(btrim(x.metadata #>> '{serper_search,snippet}'), '')
    else nullif(btrim(x.indexed_snippet), '')
  end as observation_snippet,
  case x.observation_source
    when 'public_index_result' then public.odm_audit_safe_timestamptz(x.metadata #>> '{public_index_result,observed_at}')
    when 'serper_search' then public.odm_audit_safe_timestamptz(x.metadata #>> '{serper_search,observed_at}')
    else coalesce(x.fresh_last_seen_at,x.last_observed_at)
  end as observation_observed_at,
  concat_ws(':',x.seed_id::text,x.observation_source,
    coalesce(
      case x.observation_source
        when 'public_index_result' then x.metadata #>> '{public_index_result,observed_at}'
        when 'serper_search' then x.metadata #>> '{serper_search,observed_at}'
        else coalesce(x.fresh_last_seen_at::text,x.last_observed_at::text)
      end,
      'unknown'
    )
  ) as observation_id
from selected x;

create or replace view public.odm_audit_economic_validation_v1 as
with candidates as (
  select
    a.*,
    public.odm_audit_economic_candidates_v1(a.observation_title,'title',a.observation_id) as title_economic_candidates,
    public.odm_audit_economic_candidates_v1(a.observation_snippet,'snippet',a.observation_id) as snippet_economic_candidates
  from public.odm_audit_atomic_observation_v1 a
), selected as (
  select
    c.*,
    case
      when jsonb_array_length(c.title_economic_candidates) > 0 then c.title_economic_candidates
      else c.snippet_economic_candidates
    end as selected_economic_candidates,
    case
      when jsonb_array_length(c.title_economic_candidates) > 0 then 'title'
      when jsonb_array_length(c.snippet_economic_candidates) > 0 then 'snippet'
      else null
    end as selected_evidence_source
  from candidates c
)
select
  s.*,
  case
    when jsonb_array_length(s.selected_economic_candidates) = 0 then 'missing'
    when jsonb_array_length(s.selected_economic_candidates) > 1 then 'ambiguous'
    when s.selected_economic_candidates #>> '{0,rejection_reason}' is not null then 'rejected'
    when s.observation_observed_at is null then 'unconfirmed_timestamp'
    when s.seed_provider = 'commoncrawl_cdx' and s.freshness_status <> 'fresh_confirmed' then 'archive_unconfirmed'
    else 'trusted_typed_candidate'
  end as typed_price_status,
  case
    when jsonb_array_length(s.selected_economic_candidates) = 1
      and s.selected_economic_candidates #>> '{0,rejection_reason}' is null
      and s.observation_observed_at is not null
      and not (s.seed_provider = 'commoncrawl_cdx' and s.freshness_status <> 'fresh_confirmed')
    then s.selected_economic_candidates -> 0
  end as shadow_selected_economic_candidate
from selected s;

create or replace function public.odm_audit_economic_parser_report_v1(
  p_sample_size integer default 240,
  p_sample_salt text default 'odm-economic-parser-01'
) returns jsonb
language sql
stable
set search_path = ''
as $$
with sampled as (
  select *
  from public.odm_audit_economic_validation_v1
  order by md5(seed_id::text || coalesce(p_sample_salt,''))
  limit least(greatest(coalesce(p_sample_size,240),1),2000)
)
select jsonb_build_object(
  'audit_version','odm_economic_parser_v1',
  'sample_size',count(*),
  'atomic_public_index_observations',count(*) filter(where observation_source='public_index_result'),
  'atomic_serper_observations',count(*) filter(where observation_source='serper_search'),
  'atomic_thin_index_observations',count(*) filter(where observation_source='thin_index'),
  'trusted_typed_candidates',count(*) filter(where typed_price_status='trusted_typed_candidate'),
  'ambiguous_candidates',count(*) filter(where typed_price_status='ambiguous'),
  'rejected_candidates',count(*) filter(where typed_price_status='rejected'),
  'gates',jsonb_build_object(
    'no_cross_observation_field_mixing',count(*) filter(where observation_id is null or observation_source is null)=0,
    'no_unknown_price_publication',count(*) filter(where shadow_selected_economic_candidate #>> '{economic_type}'='unknown_price')=0,
    'no_rejected_price_publication',count(*) filter(where shadow_selected_economic_candidate #>> '{rejection_reason}' is not null)=0,
    'all_selected_candidates_are_provenanced',count(*) filter(where shadow_selected_economic_candidate is not null and shadow_selected_economic_candidate #>> '{observation_id}' is null)=0
  )
)
from sampled;
$$;

revoke all on function public.odm_audit_economic_candidates_v1(text,text,text) from public,anon,authenticated;
revoke all on function public.odm_audit_economic_parser_report_v1(integer,text) from public,anon,authenticated;
revoke all on public.odm_audit_atomic_observation_v1 from public,anon,authenticated;
revoke all on public.odm_audit_economic_validation_v1 from public,anon,authenticated;
grant execute on function public.odm_audit_economic_parser_report_v1(integer,text) to service_role;
grant select on public.odm_audit_atomic_observation_v1 to service_role;
grant select on public.odm_audit_economic_validation_v1 to service_role;

comment on view public.odm_audit_atomic_observation_v1 is 'Shadow-only atomic observation envelope: title, snippet and observed_at always originate from one selected evidence object.';
comment on view public.odm_audit_economic_validation_v1 is 'Shadow-only typed economic validation with field-level provenance and fail-closed candidate selection.';
