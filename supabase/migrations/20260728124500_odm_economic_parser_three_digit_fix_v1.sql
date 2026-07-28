-- ODM-ECONOMIC-PARSER-01 correction — accept valid three-digit rents such as 900 DH/jour.
-- Shadow-only. Replaces only the parser function; no listing or public state is mutated.

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
    '((?:ancien[[:space:]]+prix|prix[[:space:]]+barr[ée]|au[[:space:]]+lieu[[:space:]]+de|à[[:space:]]+partir[[:space:]]+de|a[[:space:]]+partir[[:space:]]+de|dès)?[[:space:]]*([0-9]{1,3}(?:[ .,''’,-][0-9]{3})+|[0-9]{3,10})[[:space:]]*(mad|dhs?|dh)(?:[[:space:]]*(?:/|par)[[:space:]]*(m2|m²|mois|month|jour|day|semaine|week))?)',
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
      when normalized_fragment ~ '(à[[:space:]]+partir[[:space:]]+de|a[[:space:]]+partir[[:space:]]+de|dès)' then 'starting_price'
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
      'parser_version', 'odm_economic_parser_v1_1',
      'confidence', confidence,
      'rejection_reason', rejection_reason
    ) order by value_mad,economic_type,raw_fragment
  ),
  '[]'::jsonb
)
from deduplicated;
$$;

revoke all on function public.odm_audit_economic_candidates_v1(text,text,text) from public,anon,authenticated;
