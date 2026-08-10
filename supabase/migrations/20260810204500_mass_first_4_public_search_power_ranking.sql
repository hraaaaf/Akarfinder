-- MASS-FIRST-4 — Public Search Power Ranking
-- Preserve query/filter/cursor contract. Source policy is fail-closed and
-- channel-aware. Listing Power is the dominant non-text ranking signal.
-- canonical_link_only rows are deliberately redacted at the RPC boundary:
-- Search may expose the canonical link plus structural dimensions, never source
-- snippet/price/surface content that the Registry has not authorized for reuse.

create or replace function public.search_public_representations_v1(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_surface numeric default null,
  p_max_surface numeric default null,
  p_limit integer default 50,
  p_after_lane smallint default null,
  p_after_rank real default null,
  p_after_updated_at timestamptz default null,
  p_after_representation_id uuid default null
)
returns table(
  representation_id uuid, canonical_url text, source_domain text, seed_provider text,
  freshness_status text, title text, snippet text, normalized_city text,
  normalized_property_type text, normalized_intent text, normalized_price_mad numeric,
  normalized_surface_m2 numeric, price_per_m2_mad numeric, quality_tier text,
  quality_score smallint, display_eligibility text, display_eligibility_reason text,
  ranking_quality_boost real, updated_at timestamptz, lane_weight smallint,
  ranking_score real, total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $function$
#variable_conflict use_column
begin
  perform set_config('plan_cache_mode', 'force_custom_plan', true);

  return query
  with params as (
    select
      nullif(btrim(p_query), '') as q,
      public.odm04_normalize_city(nullif(btrim(p_city), '')) as canonical_city,
      public.odm04_normalize_property_type(nullif(btrim(p_property_type), '')) as canonical_property_type,
      public.odm04_normalize_intent(nullif(btrim(p_intent), '')) as canonical_intent,
      least(greatest(coalesce(p_limit, 50), 1), 101) as result_limit
  ), queries as (
    select p.*, case when p.q is null then null else websearch_to_tsquery('simple', p.q) end as q_ts
    from params p
  ), eligible as (
    select
      d.*,
      public.mass_first_source_public_mode_v1(d.source_domain,d.seed_provider) as public_mode
    from public.thin_index_search_documents d
    where d.document_kind = 'LISTING'
      and d.vertical_classification = 'real_estate_likely'
      and d.display_eligibility in ('eligible_primary','eligible_secondary')
      and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
      and d.freshness_status in ('seed_only','fresh_confirmed')
      and nullif(btrim(d.canonical_url), '') is not null
  ), ranked as (
    select
      d.seed_id as representation_id,
      d.canonical_url,
      d.source_domain,
      d.seed_provider,
      d.freshness_status,
      case when d.public_mode='partner_content' then d.title else null end as title,
      case when d.public_mode='partner_content' then d.snippet else null end as snippet,
      d.normalized_city,
      d.normalized_property_type,
      d.normalized_intent,
      case when d.public_mode='partner_content' then d.normalized_price_mad else null end as normalized_price_mad,
      case when d.public_mode='partner_content' then d.normalized_surface_m2 else null end as normalized_surface_m2,
      case when d.public_mode='partner_content' then d.price_per_m2_mad else null end as price_per_m2_mad,
      d.quality_tier,
      d.quality_score,
      d.display_eligibility,
      d.display_eligibility_reason,
      d.ranking_quality_boost,
      d.updated_at,
      (case d.public_mode when 'partner_content' then 0 else 1 end)::smallint as lane_weight,
      (
        (case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector, q.q_ts, 32) end)
        + (coalesce(d.listing_power_score,0)::real / 100.0::real * 0.75::real)
      )::real as ranking_score
    from eligible d
    cross join queries q
    where d.public_mode in ('canonical_link_only','partner_content')
      and (q.q_ts is null or d.search_vector @@ q.q_ts)
      and (q.canonical_city is null or d.normalized_city = q.canonical_city)
      and (q.canonical_property_type is null or d.normalized_property_type = q.canonical_property_type)
      and (q.canonical_intent is null or d.normalized_intent = q.canonical_intent)
      and (p_min_price is null or (d.public_mode='partner_content' and d.normalized_price_mad >= p_min_price))
      and (p_max_price is null or (d.public_mode='partner_content' and d.normalized_price_mad <= p_max_price))
      and (p_min_surface is null or (d.public_mode='partner_content' and d.normalized_surface_m2 >= p_min_surface))
      and (p_max_surface is null or (d.public_mode='partner_content' and d.normalized_surface_m2 <= p_max_surface))
  ), counted as (
    select r.*, count(*) over () as total_count from ranked r
  ), page as (
    select c.* from counted c
    where p_after_lane is null
       or c.lane_weight > p_after_lane
       or (c.lane_weight = p_after_lane and p_after_rank is not null and c.ranking_score < p_after_rank)
       or (c.lane_weight = p_after_lane and p_after_rank is not null and c.ranking_score = p_after_rank and p_after_updated_at is not null and c.updated_at < p_after_updated_at)
       or (c.lane_weight = p_after_lane and p_after_rank is not null and c.ranking_score = p_after_rank and p_after_updated_at is not null and c.updated_at = p_after_updated_at and p_after_representation_id is not null and c.representation_id < p_after_representation_id)
    order by c.lane_weight asc,c.ranking_score desc,c.updated_at desc,c.representation_id desc
    limit (select result_limit from queries)
  )
  select
    p.representation_id,p.canonical_url,p.source_domain,p.seed_provider,p.freshness_status,p.title,p.snippet,
    p.normalized_city,p.normalized_property_type,p.normalized_intent,p.normalized_price_mad,
    p.normalized_surface_m2,p.price_per_m2_mad,p.quality_tier,p.quality_score,p.display_eligibility,
    p.display_eligibility_reason,p.ranking_quality_boost,p.updated_at,p.lane_weight,p.ranking_score,p.total_count
  from page p;
end;
$function$;

revoke all on function public.search_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.search_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid) to service_role;

comment on function public.search_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid) is
  'MASS-FIRST public Search: channel-aware Source Registry gate, quality-independent structural eligibility, Listing Power ranking, and RPC-level redaction for canonical-link-only sources.';