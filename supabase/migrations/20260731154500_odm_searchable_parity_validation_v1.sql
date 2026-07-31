-- ODM SEARCHABLE PARITY VALIDATION V1
-- Read-only certification surfaces for post-bridge search coverage.
-- No publication, ranking or eligibility mutation.

create or replace view public.odm_searchable_parity_matrix_v1
with (security_invoker = true)
as
with cases(city, property_type, intent) as (
  values
    ('Casablanca'::text, 'apartment'::text, 'rent'::text),
    ('Casablanca', 'apartment', 'sale'),
    ('Marrakech', 'apartment', 'rent'),
    ('Rabat', 'apartment', 'sale'),
    ('Tangier', 'villa', 'sale'),
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

create or replace view public.odm_searchable_parity_casablanca_rent_v1
with (security_invoker = true)
as
with legacy as (
  select distinct ls.listing_url
  from public.property_listings pl
  join public.listing_sources ls on ls.property_listing_id = pl.id
  where lower(pl.city) = 'casablanca'
    and lower(pl.property_type) in ('appartement','apartment')
    and lower(pl.transaction_type) in ('rent','location')
    and ls.is_active is true
), odm as (
  select canonical_url
  from public.search_thin_index_v3(null,'Casablanca','apartment','rent',1000,null,null,null)
)
select
  (select count(*) from legacy)::bigint as legacy_urls,
  (select count(*) from odm)::bigint as odm_searchable_urls,
  (select count(*) from legacy l join odm o on o.canonical_url = l.listing_url)::bigint as exact_overlap,
  (select count(*) from legacy where listing_url ilike '%logic-immo%')::bigint as excluded_logic_immo_legacy_rows,
  (select count(*) from odm where canonical_url ilike '%logic-immo%')::bigint as logic_immo_odm_rows,
  (select count(*) from odm where canonical_url ilike '%mubawab.ma/fr/is/%')::bigint as mubawab_category_like_rows,
  (select count(*) from odm where canonical_url ilike '%marrakechrealty.com/%')::bigint as marrakech_realty_rows;

revoke all on public.odm_searchable_parity_matrix_v1 from public, anon, authenticated;
revoke all on public.odm_searchable_parity_casablanca_rent_v1 from public, anon, authenticated;
grant select on public.odm_searchable_parity_matrix_v1 to service_role;
grant select on public.odm_searchable_parity_casablanca_rent_v1 to service_role;

comment on view public.odm_searchable_parity_matrix_v1 is
  'Read-only post-bridge ODM search validation matrix; filter mismatch must remain zero.';
comment on view public.odm_searchable_parity_casablanca_rent_v1 is
  'Read-only Casablanca apartment rent parity proof, including exact Legacy overlap and known-noise checks.';
