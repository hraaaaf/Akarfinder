-- AKARFINDER — HONEST LISTING DEPTH BASELINE
-- Read-only audit. No DDL, DML, function call or side effect.
--
-- North Star:
--   true LISTING documents that are real-estate classified and publicly eligible.
-- Never use the total Thin Index document count as the public listing depth.

with listing_eligible as (
  select *
  from public.thin_index_search_documents
  where vertical_classification = 'real_estate_likely'
    and display_eligibility in ('eligible_primary', 'eligible_secondary')
    and document_kind = 'LISTING'
),
source_counts as (
  select
    source_domain,
    count(*)::bigint as listings,
    count(*) filter (
      where coalesce(normalized_price_mad, price_mad) is not null
    )::bigint as with_price,
    count(*) filter (
      where coalesce(normalized_surface_m2, surface_m2) is not null
    )::bigint as with_surface,
    count(*) filter (
      where coalesce(normalized_price_mad, price_mad) is not null
        and coalesce(normalized_surface_m2, surface_m2) is not null
    )::bigint as comparable
  from listing_eligible
  group by source_domain
),
city_counts as (
  select
    coalesce(normalized_city, city, recovered_city, 'UNKNOWN') as city_name,
    count(*)::bigint as listings
  from listing_eligible
  group by 1
),
provider_counts as (
  select
    seed_provider,
    count(*)::bigint as seeds,
    count(*) filter (where freshness_status = 'fresh_confirmed')::bigint as fresh_confirmed
  from public.source_offer_seeds
  group by seed_provider
),
freshness_counts as (
  select
    coalesce(freshness_status, 'UNKNOWN') as freshness_status,
    count(*)::bigint as seeds
  from public.source_offer_seeds
  group by 1
)
select jsonb_build_object(
  'captured_at', now(),
  'north_star', 'real_estate_likely + eligible_primary/secondary + LISTING',
  'thin_index_total', (
    select count(*) from public.thin_index_search_documents
  ),
  'listing_eligible_total', (
    select count(*) from listing_eligible
  ),
  'with_city', (
    select count(*)
    from listing_eligible
    where coalesce(normalized_city, city, recovered_city) is not null
  ),
  'with_type', (
    select count(*)
    from listing_eligible
    where coalesce(normalized_property_type, property_type) is not null
  ),
  'with_intent', (
    select count(*)
    from listing_eligible
    where coalesce(normalized_intent, intent) is not null
  ),
  'with_price', (
    select count(*)
    from listing_eligible
    where coalesce(normalized_price_mad, price_mad) is not null
  ),
  'with_surface', (
    select count(*)
    from listing_eligible
    where coalesce(normalized_surface_m2, surface_m2) is not null
  ),
  'with_price_and_surface', (
    select count(*)
    from listing_eligible
    where coalesce(normalized_price_mad, price_mad) is not null
      and coalesce(normalized_surface_m2, surface_m2) is not null
  ),
  'property_listings', (
    select count(*) from public.property_listings
  ),
  'listing_sources', (
    select count(*) from public.listing_sources
  ),
  'property_clusters', (
    select count(*) from public.property_clusters
  ),
  'observations', (
    select count(*) from public.source_offer_observations
  ),
  'top_sources', (
    select jsonb_agg(to_jsonb(source_row) order by listings desc)
    from (
      select *
      from source_counts
      order by listings desc
      limit 25
    ) as source_row
  ),
  'top_cities', (
    select jsonb_agg(to_jsonb(city_row) order by listings desc)
    from (
      select *
      from city_counts
      order by listings desc
      limit 30
    ) as city_row
  ),
  'seed_providers', (
    select jsonb_agg(to_jsonb(provider_row) order by seeds desc)
    from provider_counts as provider_row
  ),
  'freshness', (
    select jsonb_agg(to_jsonb(freshness_row) order by seeds desc)
    from freshness_counts as freshness_row
  )
) as honest_listing_depth_baseline;
