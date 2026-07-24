-- THIN-INDEX-SEARCH-V2
-- Dedicated, publication-safe search projection for source_offer_seeds.
-- source_offer_seeds remains the observation source of truth; this table is a
-- derived serving index used only to retrieve bounded, relevance-ranked candidates.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.thin_index_search_documents (
  seed_id uuid primary key references public.source_offer_seeds(id) on delete cascade,
  canonical_url text not null,
  source_domain text not null,
  seed_provider text not null,
  freshness_status text not null,
  title text,
  snippet text,
  query_text text,
  city text,
  property_type text,
  intent text,
  updated_at timestamptz not null,
  search_text text generated always as (
    coalesce(canonical_url, '') || ' ' ||
    coalesce(title, '') || ' ' ||
    coalesce(snippet, '') || ' ' ||
    coalesce(query_text, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(property_type, '') || ' ' ||
    coalesce(intent, '') || ' ' ||
    coalesce(source_domain, '')
  ) stored,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(city, '') || ' ' || coalesce(property_type, '') || ' ' || coalesce(intent, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(snippet, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(canonical_url, '') || ' ' || coalesce(source_domain, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(query_text, '')), 'D')
  ) stored
);

alter table public.thin_index_search_documents enable row level security;
revoke all on table public.thin_index_search_documents from anon, authenticated;

create index if not exists thin_index_search_documents_source_domain_idx
  on public.thin_index_search_documents (source_domain);

create index if not exists thin_index_search_documents_serving_order_idx
  on public.thin_index_search_documents (freshness_status, seed_provider, updated_at desc, seed_id desc);

create index if not exists thin_index_search_documents_city_idx
  on public.thin_index_search_documents (city)
  where city is not null;

create index if not exists thin_index_search_documents_property_type_idx
  on public.thin_index_search_documents (property_type)
  where property_type is not null;

create index if not exists thin_index_search_documents_intent_idx
  on public.thin_index_search_documents (intent)
  where intent is not null;

create index if not exists thin_index_search_documents_fts_idx
  on public.thin_index_search_documents using gin (search_vector)
  where freshness_status in ('seed_only', 'fresh_confirmed')
    and seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search');

create index if not exists thin_index_search_documents_trgm_idx
  on public.thin_index_search_documents using gin (search_text extensions.gin_trgm_ops)
  where freshness_status in ('seed_only', 'fresh_confirmed')
    and seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search');

create or replace function public.sync_thin_index_search_document_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.thin_index_search_documents where seed_id = old.id;
    return old;
  end if;

  if new.freshness_status not in ('seed_only', 'fresh_confirmed')
     or new.seed_provider not in ('public_sitemap', 'commoncrawl_cdx', 'serper_search') then
    delete from public.thin_index_search_documents where seed_id = new.id;
    return new;
  end if;

  insert into public.thin_index_search_documents (
    seed_id,
    canonical_url,
    source_domain,
    seed_provider,
    freshness_status,
    title,
    snippet,
    query_text,
    city,
    property_type,
    intent,
    updated_at
  ) values (
    new.id,
    new.canonical_url,
    new.source_domain,
    new.seed_provider,
    new.freshness_status,
    nullif(new.metadata #>> '{serper_search,title}', ''),
    nullif(new.metadata #>> '{serper_search,snippet}', ''),
    nullif(new.metadata #>> '{serper_search,query}', ''),
    nullif(new.metadata #>> '{serper_search,city}', ''),
    nullif(new.metadata #>> '{serper_search,property_type}', ''),
    nullif(new.metadata #>> '{serper_search,intent}', ''),
    new.updated_at
  )
  on conflict (seed_id) do update set
    canonical_url = excluded.canonical_url,
    source_domain = excluded.source_domain,
    seed_provider = excluded.seed_provider,
    freshness_status = excluded.freshness_status,
    title = excluded.title,
    snippet = excluded.snippet,
    query_text = excluded.query_text,
    city = excluded.city,
    property_type = excluded.property_type,
    intent = excluded.intent,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function public.sync_thin_index_search_document_row() from public, anon, authenticated;

drop trigger if exists thin_index_search_documents_sync_write on public.source_offer_seeds;
create trigger thin_index_search_documents_sync_write
after insert or update of canonical_url, source_domain, seed_provider, freshness_status, metadata, updated_at
on public.source_offer_seeds
for each row execute function public.sync_thin_index_search_document_row();

drop trigger if exists thin_index_search_documents_sync_delete on public.source_offer_seeds;
create trigger thin_index_search_documents_sync_delete
after delete on public.source_offer_seeds
for each row execute function public.sync_thin_index_search_document_row();

insert into public.thin_index_search_documents (
  seed_id,
  canonical_url,
  source_domain,
  seed_provider,
  freshness_status,
  title,
  snippet,
  query_text,
  city,
  property_type,
  intent,
  updated_at
)
select
  s.id,
  s.canonical_url,
  s.source_domain,
  s.seed_provider,
  s.freshness_status,
  nullif(s.metadata #>> '{serper_search,title}', ''),
  nullif(s.metadata #>> '{serper_search,snippet}', ''),
  nullif(s.metadata #>> '{serper_search,query}', ''),
  nullif(s.metadata #>> '{serper_search,city}', ''),
  nullif(s.metadata #>> '{serper_search,property_type}', ''),
  nullif(s.metadata #>> '{serper_search,intent}', ''),
  s.updated_at
from public.source_offer_seeds s
where s.freshness_status in ('seed_only', 'fresh_confirmed')
  and s.seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search')
on conflict (seed_id) do update set
  canonical_url = excluded.canonical_url,
  source_domain = excluded.source_domain,
  seed_provider = excluded.seed_provider,
  freshness_status = excluded.freshness_status,
  title = excluded.title,
  snippet = excluded.snippet,
  query_text = excluded.query_text,
  city = excluded.city,
  property_type = excluded.property_type,
  intent = excluded.intent,
  updated_at = excluded.updated_at;

create or replace function public.search_thin_index_v2(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_limit integer default 300,
  p_after_rank real default null,
  p_after_updated_at timestamptz default null,
  p_after_seed_id uuid default null
)
returns table (
  seed_id uuid,
  canonical_url text,
  source_domain text,
  seed_provider text,
  freshness_status text,
  title text,
  snippet text,
  query_text text,
  city text,
  property_type text,
  intent text,
  updated_at timestamptz,
  relevance_rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
with params as (
  select
    nullif(btrim(p_query), '') as q,
    nullif(btrim(p_city), '') as city,
    nullif(lower(btrim(p_property_type)), '') as property_type,
    nullif(lower(btrim(p_intent)), '') as intent,
    least(greatest(coalesce(p_limit, 300), 1), 500) as result_limit
),
queries as (
  select
    p.*,
    case when p.q is null then null else websearch_to_tsquery('simple', p.q) end as q_ts,
    case when p.city is null then null else plainto_tsquery('simple', p.city) end as city_ts,
    case p.property_type
      when 'apartment' then to_tsquery('simple', 'appartement | apartment | flat')
      when 'appartement' then to_tsquery('simple', 'appartement | apartment | flat')
      when 'villa' then to_tsquery('simple', 'villa')
      when 'studio' then to_tsquery('simple', 'studio')
      when 'house' then to_tsquery('simple', 'maison | house')
      when 'maison' then to_tsquery('simple', 'maison | house')
      when 'land' then to_tsquery('simple', 'terrain | land | plot')
      when 'terrain' then to_tsquery('simple', 'terrain | land | plot')
      when 'office' then to_tsquery('simple', 'bureau | office')
      when 'bureau' then to_tsquery('simple', 'bureau | office')
      when 'commercial' then to_tsquery('simple', 'commercial | commerce | local')
      else null
    end as property_ts,
    case p.intent
      when 'buy' then to_tsquery('simple', 'vendre | vente | acheter | sale | sell')
      when 'sale' then to_tsquery('simple', 'vendre | vente | acheter | sale | sell')
      when 'rent' then to_tsquery('simple', 'louer | location | rent | rental | lease')
      when 'new' then to_tsquery('simple', 'neuf | new | programme | project | residence')
      else null
    end as intent_ts
  from params p
),
ranked as (
  select
    d.seed_id,
    d.canonical_url,
    d.source_domain,
    d.seed_provider,
    d.freshness_status,
    d.title,
    d.snippet,
    d.query_text,
    d.city,
    d.property_type,
    d.intent,
    d.updated_at,
    (
      case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector, q.q_ts, 32) end
      + case when q.city is not null and lower(coalesce(d.city, '')) = lower(q.city) then 0.35::real else 0::real end
      + case when q.property_type is not null and lower(coalesce(d.property_type, '')) = q.property_type then 0.20::real else 0::real end
      + case when q.intent is not null and lower(coalesce(d.intent, '')) = q.intent then 0.15::real else 0::real end
      + case when d.freshness_status = 'fresh_confirmed' then 0.10::real else 0::real end
      + case when d.seed_provider = 'serper_search' then 0.05::real else 0::real end
    )::real as relevance_rank
  from public.thin_index_search_documents d
  cross join queries q
  where d.freshness_status in ('seed_only', 'fresh_confirmed')
    and d.seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search')
    and (q.q_ts is null or d.search_vector @@ q.q_ts)
    and (q.city_ts is null or d.search_vector @@ q.city_ts)
    and (q.property_ts is null or d.search_vector @@ q.property_ts)
    and (q.intent_ts is null or d.search_vector @@ q.intent_ts)
),
page as (
  select r.*
  from ranked r
  where p_after_rank is null
     or r.relevance_rank < p_after_rank
     or (
       r.relevance_rank = p_after_rank
       and p_after_updated_at is not null
       and r.updated_at < p_after_updated_at
     )
     or (
       r.relevance_rank = p_after_rank
       and p_after_updated_at is not null
       and r.updated_at = p_after_updated_at
       and p_after_seed_id is not null
       and r.seed_id < p_after_seed_id
     )
  order by r.relevance_rank desc, r.updated_at desc, r.seed_id desc
  limit (select result_limit from queries)
)
select * from page;
$$;

revoke all on function public.search_thin_index_v2(text, text, text, text, integer, real, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.search_thin_index_v2(text, text, text, text, integer, real, timestamptz, uuid) to service_role;
