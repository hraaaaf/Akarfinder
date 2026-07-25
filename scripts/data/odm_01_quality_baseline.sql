-- ODM-01 — DATA Quality Baseline + Recovery Map
-- Read-only. No publication, ingestion, deployment or provider-gate mutation.

with seed_counts as (
  select
    count(*) as seed_rows,
    count(distinct canonical_url) as distinct_seeds
  from public.source_offer_seeds
),
thin_counts as (
  select
    count(*) as thin_rows,
    count(distinct canonical_url) as distinct_thin,
    max(updated_at) as latest_projection
  from public.thin_index_search_documents
),
provider_mix as (
  select
    seed_provider as provider,
    count(distinct canonical_url) as distinct_urls
  from public.thin_index_search_documents
  group by seed_provider
),
freshness_mix as (
  select
    freshness_status,
    count(distinct canonical_url) as distinct_urls
  from public.thin_index_search_documents
  group by freshness_status
),
unsafe_seed as (
  select
    count(*) filter (
      where coalesce(metadata->>'discovery_status', '') in ('rejected', 'unclassified')
    ) as unsafe_seed_rows,
    count(distinct canonical_url) filter (
      where coalesce(metadata->>'discovery_status', '') in ('rejected', 'unclassified')
    ) as unsafe_seed_urls
  from public.source_offer_seeds
),
published_unsafe as (
  select
    count(*) as published_unsafe_rows,
    count(distinct t.canonical_url) as published_unsafe_urls
  from public.thin_index_search_documents t
  join public.source_offer_seeds s on s.id = t.seed_id
  where coalesce(s.metadata->>'discovery_status', '') in ('rejected', 'unclassified')
),
field_coverage as (
  select
    count(*) as total,
    count(*) filter (where nullif(trim(title), '') is not null) as title_present,
    count(*) filter (where nullif(trim(snippet), '') is not null) as snippet_present,
    count(*) filter (where nullif(trim(query_text), '') is not null) as query_text_present,
    count(*) filter (where nullif(trim(city), '') is not null) as city_present,
    count(*) filter (where nullif(trim(property_type), '') is not null) as property_type_present,
    count(*) filter (where nullif(trim(intent), '') is not null) as intent_present
  from public.thin_index_search_documents
)
select jsonb_build_object(
  'seed_counts', (select to_jsonb(seed_counts) from seed_counts),
  'thin_counts', (select to_jsonb(thin_counts) from thin_counts),
  'provider_mix', (
    select jsonb_agg(to_jsonb(provider_mix) order by distinct_urls desc)
    from provider_mix
  ),
  'freshness_mix', (
    select jsonb_agg(to_jsonb(freshness_mix) order by distinct_urls desc)
    from freshness_mix
  ),
  'unsafe_seed', (select to_jsonb(unsafe_seed) from unsafe_seed),
  'published_unsafe', (select to_jsonb(published_unsafe) from published_unsafe),
  'field_coverage', (select to_jsonb(field_coverage) from field_coverage)
);

-- Domain-level recovery matrix.
select
  t.source_domain,
  t.seed_provider,
  count(*) as rows,
  count(distinct t.canonical_url) as distinct_urls,
  count(*) filter (where t.freshness_status = 'fresh_confirmed') as fresh_confirmed,
  count(*) filter (where t.freshness_status = 'seed_only') as seed_only,
  count(*) filter (where nullif(trim(t.title), '') is not null) as title_present,
  count(*) filter (where nullif(trim(t.snippet), '') is not null) as snippet_present,
  count(*) filter (where nullif(trim(t.city), '') is not null) as city_present,
  count(*) filter (where nullif(trim(t.property_type), '') is not null) as property_type_present,
  count(*) filter (where nullif(trim(t.intent), '') is not null) as intent_present
from public.thin_index_search_documents t
group by t.source_domain, t.seed_provider
order by distinct_urls desc, t.source_domain, t.seed_provider;

-- Canonicalization anomaly check. Expected result: zero rows.
select canonical_url, count(*) as duplicate_rows
from public.thin_index_search_documents
group by canonical_url
having count(*) > 1
order by duplicate_rows desc, canonical_url;