-- ODM-04 read-only normalization certification

select
  count(*) as total_rows,
  count(*) filter (where normalization_status = 'normalized') as normalized_rows,
  count(*) filter (where normalization_status = 'partial') as partial_rows,
  count(*) filter (where normalization_status = 'unavailable') as unavailable_rows,
  count(*) filter (where normalized_city is not null) as city_normalized,
  count(*) filter (where normalized_property_type is not null) as property_type_normalized,
  count(*) filter (where normalized_intent is not null) as intent_normalized,
  count(*) filter (where normalized_price_mad is not null) as price_normalized,
  count(*) filter (where normalized_surface_m2 is not null) as surface_normalized,
  count(*) filter (where price_per_m2_mad is not null) as price_per_m2_available
from public.thin_index_search_documents;

select
  count(*) filter (where normalized_price_mad is not null and (normalized_price_mad < 10000 or normalized_price_mad > 1000000000)) as unsafe_price_rows,
  count(*) filter (where normalized_surface_m2 is not null and (normalized_surface_m2 < 10 or normalized_surface_m2 > 5000)) as unsafe_surface_rows,
  count(*) filter (where price_per_m2_mad is not null and (price_per_m2_mad < 100 or price_per_m2_mad > 1000000)) as unsafe_price_per_m2_rows,
  count(*) filter (where normalized_price_mad is not null and price_mad is null) as price_without_recovered_source,
  count(*) filter (where normalized_surface_m2 is not null and surface_m2 is null) as surface_without_recovered_source,
  count(*) filter (where normalized_city is not null and coalesce(city, recovered_city) is null) as city_without_source,
  count(*) filter (where normalization_version is distinct from 'odm04-v2') as wrong_version_rows,
  count(*) filter (where seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search')) as unexpected_provider_rows
from public.thin_index_search_documents;

select normalized_property_type, count(*) as rows
from public.thin_index_search_documents
where normalized_property_type is not null
group by normalized_property_type
order by rows desc, normalized_property_type;

select normalized_intent, count(*) as rows
from public.thin_index_search_documents
where normalized_intent is not null
group by normalized_intent
order by rows desc, normalized_intent;

select normalized_city, count(*) as rows
from public.thin_index_search_documents
where normalized_city is not null
group by normalized_city
order by rows desc, normalized_city;

select canonical_url, count(*) as duplicate_rows
from public.thin_index_search_documents
group by canonical_url
having count(*) > 1
order by duplicate_rows desc, canonical_url;
