create or replace view public.listing_representations_canonical_v1
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
    case when pl.price_mad > 0 and pl.surface_m2 > 0 then round(pl.price_mad::numeric / pl.surface_m2::numeric, 2) end as price_per_m2_mad,
    null::numeric as quality_score,
    pl.reliability_score::numeric as reliability_score,
    null::text as display_eligibility,
    case when ls.is_active is true then 'active'::text when ls.is_active is false then 'inactive'::text else null::text end as freshness_status,
    pl.updated_at
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
    d.price_per_m2_mad::numeric,
    null::numeric as quality_score,
    null::numeric as reliability_score,
    'eligible_primary'::text as display_eligibility,
    'live_minimal'::text as freshness_status,
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
    coalesce(d.price_per_m2_mad, d.normalized_price_m2)::numeric as price_per_m2_mad,
    d.quality_score::numeric,
    null::numeric as reliability_score,
    d.display_eligibility::text,
    d.freshness_status::text,
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
grouped as (
  select
    canonical_url,
    (array_agg(source_system order by source_priority asc, updated_at desc nulls last, source_record_id))[1] as canonical_source_system,
    (array_agg(source_record_id order by source_priority asc, updated_at desc nulls last, source_record_id))[1] as canonical_source_record_id,
    array_agg(distinct source_system) as source_systems,
    count(*)::integer as source_copy_count,
    (array_agg(source_domain order by source_priority asc, updated_at desc nulls last) filter (where nullif(btrim(source_domain), '') is not null))[1] as source_domain,
    (array_agg(title order by source_priority asc, updated_at desc nulls last) filter (where nullif(btrim(title), '') is not null))[1] as title,
    (array_agg(snippet order by source_priority asc, updated_at desc nulls last) filter (where nullif(btrim(snippet), '') is not null))[1] as snippet,
    (array_agg(city order by source_priority asc, updated_at desc nulls last) filter (where nullif(btrim(city), '') is not null))[1] as city,
    (array_agg(district order by source_priority asc, updated_at desc nulls last) filter (where nullif(btrim(district), '') is not null))[1] as district,
    (array_agg(property_type order by source_priority asc, updated_at desc nulls last) filter (where nullif(btrim(property_type), '') is not null))[1] as property_type,
    (array_agg(transaction_type order by source_priority asc, updated_at desc nulls last) filter (where nullif(btrim(transaction_type), '') is not null))[1] as transaction_type,
    (array_agg(price_mad order by source_priority asc, updated_at desc nulls last) filter (where price_mad is not null and price_mad > 0))[1] as price_mad,
    (array_agg(surface_m2 order by source_priority asc, updated_at desc nulls last) filter (where surface_m2 is not null and surface_m2 > 0))[1] as surface_m2,
    (array_agg(price_per_m2_mad order by source_priority asc, updated_at desc nulls last) filter (where price_per_m2_mad is not null and price_per_m2_mad > 0))[1] as price_per_m2_mad,
    max(quality_score) as quality_score,
    max(reliability_score) as reliability_score,
    (array_agg(display_eligibility order by case display_eligibility when 'eligible_primary' then 0 when 'eligible_secondary' then 1 else 2 end, source_priority asc) filter (where display_eligibility is not null))[1] as display_eligibility,
    (array_agg(freshness_status order by source_priority asc, updated_at desc nulls last) filter (where freshness_status is not null))[1] as freshness_status,
    max(updated_at) as updated_at
  from unioned
  group by canonical_url
)
select * from grouped;
