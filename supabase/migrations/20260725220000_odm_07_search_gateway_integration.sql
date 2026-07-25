-- ODM-07 SEARCH GATEWAY INTEGRATION
-- Real serving RPC over ODM-06 eligibility and bounded quality-aware ranking.

create or replace function public.search_thin_index_v3(
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
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  normalized_price_mad numeric,
  normalized_surface_m2 numeric,
  price_per_m2_mad numeric,
  quality_tier text,
  quality_score smallint,
  display_eligibility text,
  display_eligibility_reason text,
  ranking_quality_boost real,
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
    public.odm04_normalize_city(nullif(btrim(p_city), '')) as canonical_city,
    public.odm04_normalize_property_type(nullif(btrim(p_property_type), '')) as canonical_property_type,
    public.odm04_normalize_intent(nullif(btrim(p_intent), '')) as canonical_intent,
    least(greatest(coalesce(p_limit, 300), 1), 500) as result_limit
), queries as (
  select
    p.*,
    case when p.q is null then null else websearch_to_tsquery('simple', p.q) end as q_ts
  from params p
), ranked as (
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
    d.normalized_city,
    d.normalized_property_type,
    d.normalized_intent,
    d.normalized_price_mad,
    d.normalized_surface_m2,
    d.price_per_m2_mad,
    d.quality_tier,
    d.quality_score,
    d.display_eligibility,
    d.display_eligibility_reason,
    d.ranking_quality_boost,
    d.updated_at,
    (
      case when d.display_eligibility = 'eligible_primary' then 1::real else 0::real end
      + case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector, q.q_ts, 32) end
      + coalesce(d.ranking_quality_boost, 0::real)
    )::real as relevance_rank
  from public.thin_index_search_documents d
  cross join queries q
  where d.display_eligibility in ('eligible_primary','eligible_secondary')
    and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
    and d.freshness_status in ('seed_only','fresh_confirmed')
    and (q.q_ts is null or d.search_vector @@ q.q_ts)
    and (q.canonical_city is null or d.normalized_city = q.canonical_city)
    and (q.canonical_property_type is null or d.normalized_property_type = q.canonical_property_type)
    and (q.canonical_intent is null or d.normalized_intent = q.canonical_intent)
), page as (
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

revoke all on function public.search_thin_index_v3(text,text,text,text,integer,real,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.search_thin_index_v3(text,text,text,text,integer,real,timestamptz,uuid) to service_role;
