-- ODM-03 read-only certification

select
  count(*) as total_rows,
  count(distinct canonical_url) as distinct_urls,
  count(*) filter (where price_mad is not null) as price_recovered,
  count(*) filter (where surface_m2 is not null) as surface_recovered,
  count(*) filter (where coalesce(city, recovered_city) is not null) as city_available,
  count(*) filter (where property_type is not null) as property_type_available,
  count(*) filter (where intent is not null) as intent_available
from public.thin_index_search_documents;

select
  count(*) filter (where price_mad is not null and (price_mad < 10000 or price_mad > 1000000000)) as unsafe_price_rows,
  count(*) filter (where surface_m2 is not null and (surface_m2 < 10 or surface_m2 > 5000)) as unsafe_surface_rows,
  count(*) filter (where price_mad is not null and recovery_evidence->>'price' <> 'explicit_mad_marker') as price_without_evidence,
  count(*) filter (where surface_m2 is not null and recovery_evidence->>'surface' <> 'explicit_m2_marker') as surface_without_evidence,
  count(*) filter (where recovered_city is not null and recovery_evidence->>'city' is null) as city_without_evidence,
  count(*) filter (where seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search')) as unexpected_provider_rows
from public.thin_index_search_documents;

select canonical_url, count(*) as duplicate_rows
from public.thin_index_search_documents
group by canonical_url
having count(*) > 1
order by duplicate_rows desc, canonical_url;

select
  seed_provider,
  recovery_confidence,
  count(*) as rows,
  count(*) filter (where price_mad is not null) as with_price,
  count(*) filter (where surface_m2 is not null) as with_surface,
  count(*) filter (where recovered_city is not null) as with_city
from public.thin_index_search_documents
group by seed_provider, recovery_confidence
order by seed_provider, recovery_confidence nulls last;
