-- SEO-5C / ODM economic parser V2 dash-currency fix
-- Forward-only patch. Keeps parser contract/version unchanged and only accepts
-- an optional hyphen between a numeric amount and MAD/DH currency token.
-- Example newly accepted form: "3 050 000 - DH".

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
    '(([^0-9]{0,48})([0-9]{1,3}(?:[ .,''’][0-9]{3})+|[0-9]{3,10})[[:space:]]*(?:-[[:space:]]*)?(mad|dhs?|dh)(?:[[:space:]]*(?:/|par)[[:space:]]*(m2|m²|mois|month|jour|day|semaine|week))?)',
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

-- Migration-time regression assertions. These fail the migration atomically if
-- the new form is not recognized or the existing no-hyphen form regresses.
do $$
declare
  dashed jsonb;
  plain jsonb;
begin
  dashed := public.odm_audit_economic_candidates_v2(
    'Appartement à vendre 3 050 000 - DH à Casablanca',
    'title',
    'seo5c-dash-regression',
    '2026-09-05T00:00:00Z'::timestamptz,
    'test.title'
  );

  if jsonb_array_length(dashed) <> 1
     or dashed->0->>'value_mad' <> '3050000'
     or dashed->0->>'economic_type' <> 'sale_total'
     or dashed->0->>'currency' <> 'MAD'
     or dashed->0->>'rejection_reason' is not null
  then
    raise exception 'SEO-5C regression: dashed MAD/DH amount was not parsed as one trusted sale candidate: %', dashed;
  end if;

  plain := public.odm_audit_economic_candidates_v2(
    'Appartement à vendre 3 050 000 DH à Casablanca',
    'title',
    'seo5c-plain-regression',
    '2026-09-05T00:00:00Z'::timestamptz,
    'test.title'
  );

  if jsonb_array_length(plain) <> 1
     or plain->0->>'value_mad' <> '3050000'
     or plain->0->>'economic_type' <> 'sale_total'
     or plain->0->>'rejection_reason' is not null
  then
    raise exception 'SEO-5C regression: existing plain MAD/DH amount behavior changed: %', plain;
  end if;
end
$$;

revoke all on function public.odm_audit_economic_candidates_v2(text,text,text,timestamptz,text) from public,anon,authenticated;

comment on function public.odm_audit_economic_candidates_v2(text,text,text,timestamptz,text) is
  'Shadow-only typed economic candidates V2 with value-level provenance and fail-closed ancillary/range handling. SEO-5C adds optional dash before MAD/DH currency token without changing parser version or publication/ranking eligibility.';
