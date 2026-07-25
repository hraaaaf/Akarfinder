-- ODM-02 read-only freshness measurements

select
  count(*) as thin_rows,
  count(distinct canonical_url) as distinct_searchable,
  count(*) filter (where freshness_status = 'fresh_confirmed') as fresh_confirmed,
  count(*) filter (where freshness_status = 'seed_only') as seed_only,
  max(updated_at) as latest_projection
from public.thin_index_search_documents;

select
  source_domain,
  seed_provider,
  count(*) as total_rows,
  count(distinct canonical_url) as distinct_urls,
  count(*) filter (where freshness_status = 'fresh_confirmed') as fresh_confirmed,
  count(*) filter (where freshness_status = 'seed_only') as seed_only
from public.thin_index_search_documents
group by source_domain, seed_provider
order by seed_only desc, source_domain, seed_provider;

select
  source_domain,
  seed_provider,
  freshness_status,
  count(*) as rows,
  min(updated_at) as oldest_projection,
  max(updated_at) as newest_projection
from public.thin_index_search_documents
group by source_domain, seed_provider, freshness_status
order by source_domain, seed_provider, freshness_status;

select canonical_url, count(*) as duplicate_rows
from public.thin_index_search_documents
group by canonical_url
having count(*) > 1
order by duplicate_rows desc, canonical_url;
