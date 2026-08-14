-- RANKING-V2 — business hierarchy + quality/freshness + deterministic diversity.
-- Current production inventory remains external lane unless an explicit business entitlement exists.

create table if not exists public.search_business_entitlements (
  organization_id uuid primary key,
  business_lane smallint not null check (business_lane in (0, 1)),
  entitlement_kind text not null check (entitlement_kind in ('premium_promoter', 'partner_agency')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (business_lane = 0 and entitlement_kind = 'premium_promoter')
    or (business_lane = 1 and entitlement_kind = 'partner_agency')
  )
);

alter table public.search_business_entitlements enable row level security;
revoke all on public.search_business_entitlements from anon, authenticated;

create or replace function public.search_public_representations_v2(
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
language plpgsql
stable
security definer
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
  ), base as (
    select
      d.*,
      coalesce((
        select min(e.business_lane)
        from public.listing_sources ls
        join public.professional_listing_ownership po
          on po.property_listing_id = ls.property_listing_id
         and po.status = 'verified'
        join public.search_business_entitlements e
          on e.organization_id = po.organization_id
         and e.active
         and (e.starts_at is null or e.starts_at <= now())
         and (e.ends_at is null or e.ends_at > now())
        where ls.is_active
          and (ls.listing_url = d.canonical_url or ls.source_url = d.canonical_url)
      ), 3)::smallint as business_lane,
      case d.freshness_status when 'fresh_confirmed' then 0.12::real else 0.03::real end as freshness_boost,
      (
        (case when d.normalized_city is not null then 0.02 else 0 end)
        + (case when d.normalized_property_type is not null then 0.02 else 0 end)
        + (case when d.normalized_intent is not null then 0.02 else 0 end)
        + (case when d.normalized_price_mad is not null then 0.02 else 0 end)
        + (case when d.normalized_surface_m2 is not null then 0.02 else 0 end)
      )::real as completeness_boost
    from public.thin_index_search_documents d
    cross join queries q
    where d.document_kind = 'LISTING'
      and d.display_eligibility in ('eligible_primary', 'eligible_secondary')
      and d.seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search')
      and d.freshness_status in ('seed_only', 'fresh_confirmed')
      and nullif(btrim(d.canonical_url), '') is not null
      and (q.q_ts is null or d.search_vector @@ q.q_ts)
      and (q.canonical_city is null or d.normalized_city = q.canonical_city)
      and (q.canonical_property_type is null or d.normalized_property_type = q.canonical_property_type)
      and (q.canonical_intent is null or d.normalized_intent = q.canonical_intent)
      and (p_min_price is null or d.normalized_price_mad >= p_min_price)
      and (p_max_price is null or d.normalized_price_mad <= p_max_price)
      and (p_min_surface is null or d.normalized_surface_m2 >= p_min_surface)
      and (p_max_surface is null or d.normalized_surface_m2 <= p_max_surface)
  ), exact_dedup as (
    select *
    from (
      select b.*,
        row_number() over (
          partition by lower(b.canonical_url)
          order by b.business_lane asc, coalesce(b.quality_score, 0) desc, b.updated_at desc, b.seed_id desc
        ) as url_rank
      from base b
    ) x
    where x.url_rank = 1
  ), scored as (
    select
      d.*,
      (
        case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector, q.q_ts, 32) end
        + coalesce(d.ranking_quality_boost, 0::real)
        + d.freshness_boost
        + d.completeness_boost
        + case when d.display_eligibility = 'eligible_primary' then 0.04::real else 0::real end
      )::real as base_score,
      row_number() over (
        partition by d.business_lane, d.source_domain
        order by
          (case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector, q.q_ts, 32) end
           + coalesce(d.ranking_quality_boost, 0::real)
           + d.freshness_boost
           + d.completeness_boost) desc,
          d.updated_at desc,
          d.seed_id desc
      ) as source_position
    from exact_dedup d
    cross join queries q
  ), ranked as (
    select s.*,
      greatest(0::real,
        s.base_score - least(0.08::real, greatest(0, s.source_position - 1)::real * 0.004::real)
      )::real as final_score
    from scored s
  ), counted as (
    select r.*, count(*) over () as total_count
    from ranked r
  ), page as (
    select c.*
    from counted c
    where p_after_lane is null
       or c.business_lane > p_after_lane
       or (c.business_lane = p_after_lane and p_after_rank is not null and c.final_score < p_after_rank)
       or (c.business_lane = p_after_lane and p_after_rank is not null and c.final_score = p_after_rank and p_after_updated_at is not null and c.updated_at < p_after_updated_at)
       or (c.business_lane = p_after_lane and p_after_rank is not null and c.final_score = p_after_rank and p_after_updated_at is not null and c.updated_at = p_after_updated_at and p_after_representation_id is not null and c.seed_id < p_after_representation_id)
    order by c.business_lane asc, c.final_score desc, c.updated_at desc, c.seed_id desc
    limit (select result_limit from queries)
  )
  select
    p.seed_id,
    p.canonical_url,
    p.source_domain,
    p.seed_provider,
    p.freshness_status,
    p.title,
    p.snippet,
    p.normalized_city,
    p.normalized_property_type,
    p.normalized_intent,
    p.normalized_price_mad,
    p.normalized_surface_m2,
    p.price_per_m2_mad,
    p.quality_tier,
    p.quality_score,
    p.display_eligibility,
    p.display_eligibility_reason,
    p.ranking_quality_boost,
    p.updated_at,
    p.business_lane,
    p.final_score,
    p.total_count
  from page p;
end;
$function$;

grant execute on function public.search_public_representations_v2(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid) to anon, authenticated, service_role;

comment on function public.search_public_representations_v2 is
'Ranking v2: business lanes 0 premium promoter, 1 partner agency, 2 reserved first-party owner, 3 external; then relevance, quality, freshness, completeness, exact URL dedup and deterministic source-diversity penalty.';
