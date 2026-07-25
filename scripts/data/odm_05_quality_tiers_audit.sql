-- ODM-05 read-only certification

select
  quality_tier,
  count(*) as rows,
  min(quality_score) as min_score,
  max(quality_score) as max_score,
  count(*) filter (where freshness_status = 'fresh_confirmed') as fresh_confirmed,
  count(*) filter (where normalized_price_mad is not null) as with_price,
  count(*) filter (where normalized_surface_m2 is not null) as with_surface,
  count(*) filter (where normalized_city is not null) as with_city
from public.thin_index_search_documents
group by quality_tier
order by quality_tier;

select
  count(*) filter (where quality_tier is null) as missing_tier,
  count(*) filter (where quality_score is null) as missing_score,
  count(*) filter (where quality_version <> 'odm05-v1') as wrong_version,
  count(*) filter (where quality_score < 0 or quality_score > 10) as invalid_score,
  count(*) filter (
    where quality_tier = 'Q3_intelligence_ready'
      and (
        freshness_status <> 'fresh_confirmed'
        or normalized_city is null
        or normalized_property_type is null
        or normalized_intent is null
        or (normalized_price_mad is null and normalized_surface_m2 is null)
      )
  ) as unsafe_q3_rows,
  count(*) filter (
    where quality_tier = 'Q2_comparable'
      and (
        ((normalized_city is not null)::int +
         (normalized_property_type is not null)::int +
         (normalized_intent is not null)::int) < 2
        or (normalized_price_mad is null and normalized_surface_m2 is null and normalized_price_m2 is null)
      )
  ) as unsafe_q2_rows,
  count(*) filter (where seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search')) as unexpected_provider_rows
from public.thin_index_search_documents;

select canonical_url, count(*) as duplicate_rows
from public.thin_index_search_documents
group by canonical_url
having count(*) > 1
order by duplicate_rows desc, canonical_url;

select
  quality_tier,
  quality_score,
  quality_dimensions,
  canonical_url
from public.thin_index_search_documents
where quality_tier in ('Q2_comparable','Q3_intelligence_ready')
order by quality_tier desc, quality_score desc, updated_at desc
limit 100;
