-- ODM SEARCHABLE PARITY TANGER FIX V1
-- Corrects the validation case to the canonical Moroccan city label.

create or replace view public.odm_searchable_parity_matrix_v1
with (security_invoker = true)
as
with cases(city, property_type, intent) as (
  values
    ('Casablanca'::text, 'apartment'::text, 'rent'::text),
    ('Casablanca', 'apartment', 'sale'),
    ('Marrakech', 'apartment', 'rent'),
    ('Rabat', 'apartment', 'sale'),
    ('Tanger', 'villa', 'sale'),
    ('Agadir', 'apartment', 'rent')
)
select
  c.city,
  c.property_type,
  c.intent,
  count(r.seed_id)::bigint as searchable_rows,
  count(*) filter (where r.quality_tier in ('A','B'))::bigint as high_quality_rows,
  count(*) filter (where r.display_eligibility = 'eligible_primary')::bigint as primary_rows,
  count(*) filter (where r.display_eligibility = 'eligible_secondary')::bigint as secondary_rows,
  count(*) filter (
    where r.normalized_city is distinct from c.city
       or r.normalized_property_type is distinct from c.property_type
       or r.normalized_intent is distinct from c.intent
  )::bigint as filter_mismatch_rows
from cases c
left join lateral public.search_thin_index_v3(
  null, c.city, c.property_type, c.intent, 1000, null, null, null
) r on true
group by c.city, c.property_type, c.intent;

revoke all on public.odm_searchable_parity_matrix_v1 from public, anon, authenticated;
grant select on public.odm_searchable_parity_matrix_v1 to service_role;
