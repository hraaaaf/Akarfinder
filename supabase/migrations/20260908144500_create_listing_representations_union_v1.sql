create or replace view public.listing_representations_union_v1
with (security_invoker = true)
as
with property_rows as (
  select
    coalesce(nullif(btrim(ls.listing_url), ''), nullif(btrim(ls.source_url), '')) as canonical_url,
    'property_listings'::text as source_system,
    1::smallint as source_priority,
    pl.id::text as source_record_id,
    ls.source_name::text as source_domain,
    pl.title::text as title,
    pl.description_snippet::text as snippet,
    pl.city::text as city,
    pl.district::text as district,
    pl.property_type::text as property_type,
    pl.transaction_type::text as transaction_type,
    pl.price_mad::numeric as price_mad,
    pl.surface_m2::numeric as surface_m2,
    pl.reliability_score::numeric as quality_score,
    pl.updated_at as updated_at
  from public.property_listings pl
  join public.listing_sources ls on ls.property_listing_id = pl.id
  where coalesce(nullif(btrim(ls.listing_url), ''), nullif(btrim(ls.source_url), '')) is not null
),
minimal_rows as (
  select
    d.canonical_url,
    'minimal_live_search_documents_v1'::text as source_system,
    2::smallint as source_priority,
    d.id::text as source_record_id,
    d.source_domain::text,
    d.title::text,
    null::text as snippet,
    d.city::text,
    d.district::text,
    d.property_type::text,
    d.transaction_type::text,
    d.price_mad::numeric,
    d.surface_m2::numeric,
    null::numeric as quality_score,
    d.updated_at
  from public.minimal_live_search_documents_v1 d
  where nullif(btrim(d.canonical_url), '') is not null
),
thin_rows as (
  select
    d.canonical_url,
    'thin_index_search_documents'::text as source_system,
    3::smallint as source_priority,
    d.seed_id::text as source_record_id,
    d.source_domain::text,
    d.title::text,
    d.snippet::text,
    coalesce(d.normalized_city, d.recovered_city, d.city)::text as city,
    null::text as district,
    coalesce(d.normalized_property_type, d.property_type)::text as property_type,
    coalesce(d.normalized_intent, d.intent)::text as transaction_type,
    coalesce(d.normalized_price_mad, d.price_mad)::numeric as price_mad,
    coalesce(d.normalized_surface_m2, d.surface_m2)::numeric as surface_m2,
    d.quality_score::numeric,
    d.updated_at
  from public.thin_index_search_documents d
  where nullif(btrim(d.canonical_url), '') is not null
),
unioned as (
  select * from property_rows
  union all
  select * from minimal_rows
  union all
  select * from thin_rows
),
ranked as (
  select
    u.*,
    row_number() over (
      partition by u.canonical_url
      order by u.source_priority asc, u.quality_score desc nulls last, u.updated_at desc nulls last, u.source_record_id
    ) as canonical_rank,
    count(*) over (partition by u.canonical_url) as source_copy_count
  from unioned u
)
select
  canonical_url,
  source_system,
  source_priority,
  source_record_id,
  source_domain,
  title,
  snippet,
  city,
  district,
  property_type,
  transaction_type,
  price_mad,
  surface_m2,
  quality_score,
  updated_at,
  source_copy_count
from ranked
where canonical_rank = 1;
