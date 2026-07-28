-- ODM-SURFACE-03 — grouped surface numbers (2 000, 2.000, 2,000 m²).
-- Shadow-only parser replacement; no persisted data mutation.

create or replace function public.odm_audit_surface_candidates_v1(
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
    case
      when m[2] ~ '[ .,''’][0-9]{3}' then nullif(regexp_replace(m[2], '[^0-9]', '', 'g'), '')::numeric
      else replace(m[2], ',', '.')::numeric
    end as value_m2,
    lower(coalesce(m[1],'')) as normalized_fragment
  from regexp_matches(
    coalesce(p_text,''),
    '((?:surface|superficie|terrain|parcelle|lot|terrasse|jardin|mezzanine|local[[:space:]]+commercial|commerce|magasin|appartement|villa|maison|riad|bureau|studio)?[^0-9]{0,32}([0-9]{1,3}(?:[ .,''’][0-9]{3})+|[0-9]{1,6}(?:[.,][0-9]+)?)[[:space:]]*(?:m2|m²))',
    'gi'
  ) as m
), classified as (
  select *,case
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+(habitable|de[[:space:]]+vie)' then 'living_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+(construite|bâtie|batisse|couverte)|construit[[:space:]]*:|couverte' then 'built_surface_m2'
    when normalized_fragment ~ '(terrain|parcelle|lot)' then 'plot_surface_m2'
    when normalized_fragment ~ 'terrasse' then 'terrace_surface_m2'
    when normalized_fragment ~ 'jardin' then 'garden_surface_m2'
    when normalized_fragment ~ 'mezzanine' then 'mezzanine_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+(commerciale|commercial)|local[[:space:]]+commercial|commerce|magasin' then 'commercial_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+utile' then 'usable_surface_m2'
    when normalized_fragment ~ '(surface|superficie)[[:space:]]+totale' then 'total_surface_m2'
    when normalized_fragment ~ '(appartement|villa|maison|riad|bureau|studio)' then 'advertised_surface_m2'
    when normalized_fragment ~ '(surface|superficie)' then 'advertised_surface_m2'
    else 'unknown_surface_m2' end as surface_type
  from matches where value_m2 between 9 and 100000
), annotated as (
  select *,case when surface_type='unknown_surface_m2' then 'surface_context_unconfirmed' end as rejection_reason,
    case when surface_type='unknown_surface_m2' then 0.45 when surface_type='advertised_surface_m2' then 0.78 else 0.94 end as confidence
  from classified
)
select coalesce(jsonb_agg(jsonb_build_object(
  'value_m2',value_m2,'surface_type',surface_type,
  'evidence_source',nullif(btrim(p_evidence_source),''),
  'observation_id',nullif(btrim(p_observation_id),''),
  'raw_fragment',raw_fragment,'normalized_fragment',normalized_fragment,
  'parser_version','odm_surface_parser_v3','confidence',confidence,
  'rejection_reason',rejection_reason
) order by value_m2,surface_type),'[]'::jsonb) from annotated;
$$;

revoke all on function public.odm_audit_surface_candidates_v1(text,text,text) from public,anon,authenticated;
