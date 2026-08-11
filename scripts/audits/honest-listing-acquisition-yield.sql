-- AKARFINDER — HONEST LISTING ACQUISITION YIELD
-- Read-only audit.
--
-- Measures the real conversion funnel:
-- seed -> real estate -> LISTING -> publicly eligible LISTING.

with seed_base as (
  select
    id,
    seed_provider,
    source_domain,
    freshness_status
  from public.source_offer_seeds
),
doc_flags as (
  select
    seed_id,
    bool_or(vertical_classification = 'real_estate_likely') as is_real_estate,
    bool_or(document_kind = 'LISTING') as is_listing,
    bool_or(
      vertical_classification = 'real_estate_likely'
      and document_kind = 'LISTING'
      and display_eligibility in ('eligible_primary', 'eligible_secondary')
    ) as is_public_listing,
    bool_or(coalesce(normalized_price_mad, price_mad) is not null) as has_price,
    bool_or(coalesce(normalized_surface_m2, surface_m2) is not null) as has_surface
  from public.thin_index_search_documents
  group by seed_id
),
joined as (
  select
    seeds.seed_provider,
    seeds.source_domain,
    seeds.freshness_status,
    coalesce(flags.is_real_estate, false) as is_real_estate,
    coalesce(flags.is_listing, false) as is_listing,
    coalesce(flags.is_public_listing, false) as is_public_listing,
    coalesce(flags.has_price, false) as has_price,
    coalesce(flags.has_surface, false) as has_surface
  from seed_base as seeds
  left join doc_flags as flags on flags.seed_id = seeds.id
)
select
  seed_provider,
  source_domain,
  count(*)::bigint as seeds,
  count(*) filter (
    where freshness_status = 'fresh_confirmed'
  )::bigint as fresh_confirmed,
  count(*) filter (
    where is_real_estate
  )::bigint as real_estate,
  count(*) filter (
    where is_listing
  )::bigint as listing,
  count(*) filter (
    where is_public_listing
  )::bigint as public_listing,
  count(*) filter (
    where is_public_listing and has_price
  )::bigint as public_with_price,
  count(*) filter (
    where is_public_listing and has_surface
  )::bigint as public_with_surface,
  round(
    100.0 * count(*) filter (where is_public_listing) / nullif(count(*), 0),
    2
  ) as seed_to_public_listing_pct,
  round(
    100.0 * count(*) filter (where is_public_listing)
      / nullif(count(*) filter (where is_real_estate), 0),
    2
  ) as real_estate_to_public_listing_pct
from joined
group by seed_provider, source_domain
order by public_listing desc, seeds desc;
