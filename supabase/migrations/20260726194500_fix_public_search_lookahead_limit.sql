-- ODM-09E: preserve a one-row internal lookahead for public pages capped at 100.
-- The application requests page_size + 1 rows, then returns at most page_size.
-- Therefore the RPC must accept 101 internally while the public API remains capped at 100.

begin;

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
returns table (
  representation_id uuid,
  canonical_url text,
  source_domain text,
  seed_provider text,
  freshness_status text,
  title text,
  snippet text,
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
  lane_weight smallint,
  ranking_score real,
  total_count bigint
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
    least(greatest(coalesce(p_limit, 50), 1), 101) as result_limit
), queries as (
  select
    p.*,
    case when p.q is null then null else websearch_to_tsquery('simple', p.q) end as q_ts
  from params p
), ranked as (
  select
    r.*,
    (
      case when q.q_ts is null then 0::real
           else ts_rank_cd(d.search_vector, q.q_ts, 32)
      end
      + coalesce(r.ranking_quality_boost, 0::real)
    )::real as ranking_score
  from public.public_search_representations_v1 r
  join public.thin_index_search_documents d on d.seed_id = r.representation_id
  cross join queries q
  where (q.q_ts is null or d.search_vector @@ q.q_ts)
    and (q.canonical_city is null or r.normalized_city = q.canonical_city)
    and (q.canonical_property_type is null or r.normalized_property_type = q.canonical_property_type)
    and (q.canonical_intent is null or r.normalized_intent = q.canonical_intent)
    and (p_min_price is null or r.normalized_price_mad >= p_min_price)
    and (p_max_price is null or r.normalized_price_mad <= p_max_price)
    and (p_min_surface is null or r.normalized_surface_m2 >= p_min_surface)
    and (p_max_surface is null or r.normalized_surface_m2 <= p_max_surface)
), counted as (
  select ranked.*, count(*) over () as total_count
  from ranked
), page as (
  select c.*
  from counted c
  where p_after_lane is null
     or c.lane_weight > p_after_lane
     or (
       c.lane_weight = p_after_lane
       and p_after_rank is not null
       and c.ranking_score < p_after_rank
     )
     or (
       c.lane_weight = p_after_lane
       and p_after_rank is not null
       and c.ranking_score = p_after_rank
       and p_after_updated_at is not null
       and c.updated_at < p_after_updated_at
     )
     or (
       c.lane_weight = p_after_lane
       and p_after_rank is not null
       and c.ranking_score = p_after_rank
       and p_after_updated_at is not null
       and c.updated_at = p_after_updated_at
       and p_after_representation_id is not null
       and c.representation_id < p_after_representation_id
     )
  order by
    c.lane_weight asc,
    c.ranking_score desc,
    c.updated_at desc,
    c.representation_id desc
  limit (select result_limit from queries)
)
select
  representation_id,
  canonical_url,
  source_domain,
  seed_provider,
  freshness_status,
  title,
  snippet,
  normalized_city,
  normalized_property_type,
  normalized_intent,
  normalized_price_mad,
  normalized_surface_m2,
  price_per_m2_mad,
  quality_tier,
  quality_score,
  display_eligibility,
  display_eligibility_reason,
  ranking_quality_boost,
  updated_at,
  lane_weight,
  ranking_score,
  total_count
from page;
$$;

revoke all on function public.search_public_representations_v1(
  text, text, text, text, numeric, numeric, numeric, numeric,
  integer, smallint, real, timestamptz, uuid
) from public, anon, authenticated;

grant execute on function public.search_public_representations_v1(
  text, text, text, text, numeric, numeric, numeric, numeric,
  integer, smallint, real, timestamptz, uuid
) to service_role;

comment on function public.search_public_representations_v1 is
  'Cursor-paginated public Search RPC. Accepts up to 101 internal rows so a 100-result public page can expose has_more safely.';

commit;
