-- THIN-INDEX-SEARCH-V2 URL TOKENIZATION HARDENING
-- Preserve V1 discoverability for sitemap/Common Crawl seeds whose searchable
-- evidence lives primarily in URL slugs. PostgreSQL's text parser can treat a
-- full URL/path as URL-shaped lexemes, so explicitly normalize separators.

drop index if exists public.thin_index_search_documents_fts_idx;

alter table public.thin_index_search_documents
  drop column if exists search_vector;

alter table public.thin_index_search_documents
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(city, '') || ' ' || coalesce(property_type, '') || ' ' || coalesce(intent, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(snippet, '')), 'B') ||
    setweight(
      to_tsvector(
        'simple',
        regexp_replace(lower(coalesce(canonical_url, '') || ' ' || coalesce(source_domain, '')), '[^[:alnum:]]+', ' ', 'g')
      ),
      'C'
    ) ||
    setweight(to_tsvector('simple', coalesce(query_text, '')), 'D')
  ) stored;

create index thin_index_search_documents_fts_idx
  on public.thin_index_search_documents using gin (search_vector)
  where freshness_status in ('seed_only', 'fresh_confirmed')
    and seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search');
