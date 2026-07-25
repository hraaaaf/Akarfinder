-- ODM-02 read-only freshness measurements and completion certification

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

-- Accepted discovery evidence already represented in the canonical seed reservoir.
-- A non-zero promotable_seed_only value means reconciliation still has work to do.
with accepted as (
  select
    canonical_url,
    max(coalesce(last_seen_at, discovered_at, updated_at, created_at)) as seen_at,
    array_agg(distinct provider order by provider) as providers
  from public.discovery_candidates
  where discovery_status = 'accepted'
    and canonical_url is not null
  group by canonical_url
)
select
  count(*) filter (where s.freshness_status = 'seed_only') as promotable_seed_only,
  count(*) as matched_total,
  min(a.seen_at) as oldest_accepted_evidence,
  max(a.seen_at) as newest_accepted_evidence
from public.source_offer_seeds s
join accepted a using (canonical_url);

-- Publication safety gate: all four values must be zero.
select
  count(*) filter (
    where dc.discovery_status in ('rejected', 'unclassified')
      and s.canonical_url is not null
  ) as unsafe_seed_matches,
  count(*) filter (
    where dc.discovery_status in ('rejected', 'unclassified')
      and ti.canonical_url is not null
  ) as unsafe_thin_index_matches,
  count(*) filter (
    where ti.seed_provider not in ('commoncrawl_cdx', 'public_sitemap', 'serper_search')
  ) as unexpected_provider_rows,
  (
    select count(*)
    from (
      select canonical_url
      from public.thin_index_search_documents
      group by canonical_url
      having count(*) > 1
    ) duplicates
  ) as duplicate_canonical_urls
from public.discovery_candidates dc
left join public.source_offer_seeds s
  on s.canonical_url = dc.canonical_url
left join public.thin_index_search_documents ti
  on ti.canonical_url = dc.canonical_url;
