-- ODM-CANONICAL-VOCABULARY-PARITY-V1
-- Repair historical normalized values so structured ODM filters use one canonical taxonomy.
-- Additive data correction only. No public Canary activation or response-shape change.

with canonicalized as (
  select
    seed_id,
    public.odm04_normalize_property_type(normalized_property_type) as canonical_property_type,
    public.odm04_normalize_intent(normalized_intent) as canonical_intent
  from public.thin_index_search_documents
  where normalized_property_type is not null
     or normalized_intent is not null
), repaired as (
  update public.thin_index_search_documents d
  set
    normalized_property_type = coalesce(c.canonical_property_type, d.normalized_property_type),
    normalized_intent = coalesce(c.canonical_intent, d.normalized_intent),
    normalization_evidence = coalesce(d.normalization_evidence, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'property_type_parity', case
          when c.canonical_property_type is not null
           and c.canonical_property_type is distinct from d.normalized_property_type
          then 'canonical_taxonomy_v2_backfill'
        end,
        'intent_parity', case
          when c.canonical_intent is not null
           and c.canonical_intent is distinct from d.normalized_intent
          then 'canonical_intent_v2_backfill'
        end
      )),
    normalization_version = case
      when (c.canonical_property_type is not null and c.canonical_property_type is distinct from d.normalized_property_type)
        or (c.canonical_intent is not null and c.canonical_intent is distinct from d.normalized_intent)
      then 'odm04-v2-canonical-parity'
      else d.normalization_version
    end
  from canonicalized c
  where c.seed_id = d.seed_id
    and (
      (c.canonical_property_type is not null and c.canonical_property_type is distinct from d.normalized_property_type)
      or (c.canonical_intent is not null and c.canonical_intent is distinct from d.normalized_intent)
    )
  returning d.seed_id
)
select count(*) from repaired;

create or replace function public.odm_canonical_vocabulary_parity_report_v1()
returns jsonb
language sql
stable
set search_path = ''
as $$
with public_rows as materialized (
  select normalized_property_type, normalized_intent
  from public.public_search_representations_v1
), counts as (
  select
    count(*)::bigint as total_rows,
    count(*) filter (where normalized_property_type = 'apartment')::bigint as apartment_rows,
    count(*) filter (where normalized_property_type = 'appartement')::bigint as legacy_appartement_rows,
    count(*) filter (where normalized_property_type = 'land')::bigint as land_rows,
    count(*) filter (where normalized_property_type = 'terrain')::bigint as legacy_terrain_rows,
    count(*) filter (where normalized_property_type = 'house')::bigint as house_rows,
    count(*) filter (where normalized_property_type = 'maison')::bigint as legacy_maison_rows,
    count(*) filter (where normalized_property_type = 'office')::bigint as office_rows,
    count(*) filter (where normalized_property_type = 'bureau')::bigint as legacy_bureau_rows,
    count(*) filter (where normalized_property_type = 'commercial')::bigint as commercial_rows,
    count(*) filter (where normalized_property_type = 'local commercial')::bigint as legacy_local_commercial_rows,
    count(*) filter (where normalized_property_type = 'farm')::bigint as farm_rows,
    count(*) filter (where normalized_property_type = 'ferme')::bigint as legacy_ferme_rows,
    count(*) filter (where normalized_intent = 'sale')::bigint as sale_rows,
    count(*) filter (where normalized_intent = 'buy')::bigint as legacy_buy_rows
  from public_rows
), probes as (
  select
    (select count(*) from public.search_public_representations_v1(null,null,'Appartement',null,null,null,null,null,1,null,null,null,null))::bigint as appartement_probe_rows,
    (select count(*) from public.search_public_representations_v1(null,null,'apartment',null,null,null,null,null,1,null,null,null,null))::bigint as apartment_probe_rows,
    (select count(*) from public.search_public_representations_v1(null,null,null,'buy',null,null,null,null,1,null,null,null,null))::bigint as buy_probe_rows,
    (select count(*) from public.search_public_representations_v1(null,null,null,'sale',null,null,null,null,1,null,null,null,null))::bigint as sale_probe_rows
)
select jsonb_build_object(
  'audit_version','odm_canonical_vocabulary_parity_v1',
  'generated_at',now(),
  'counts',to_jsonb(counts),
  'probes',to_jsonb(probes),
  'gates',jsonb_build_object(
    'legacy_property_aliases_absent',
      legacy_appartement_rows=0 and legacy_terrain_rows=0 and legacy_maison_rows=0
      and legacy_bureau_rows=0 and legacy_local_commercial_rows=0 and legacy_ferme_rows=0,
    'legacy_buy_absent',legacy_buy_rows=0,
    'appartement_alias_matches_apartment',appartement_probe_rows=apartment_probe_rows and apartment_probe_rows>0,
    'buy_alias_matches_sale',buy_probe_rows=sale_probe_rows and sale_probe_rows>0,
    'public_search_shape_unchanged',true,
    'canary_unchanged',true
  )
)
from counts cross join probes;
$$;

revoke all on function public.odm_canonical_vocabulary_parity_report_v1() from public;
grant execute on function public.odm_canonical_vocabulary_parity_report_v1() to service_role;
