-- MASS-INDEX M7-E — public search policy guard
-- Objective: keep public search Google-like and link-oriented without exposing protected source content.
-- Preconditions: search_public_representations_v2, source_policy_registry and source_external_tail_policy_v1 exist.
-- Impact: replaces the serving RPC only; no source/index row is modified.
-- Re-run behavior: CREATE OR REPLACE FUNCTION + idempotent privilege statements.
-- Lock estimate: function catalog replacement only; no table scan or rewrite.
-- Rollback: restore the immediately previous search_public_representations_v2 body from migration history.

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
  ),
  queries as (
    select
      p.*,
      case when p.q is null then null else websearch_to_tsquery('simple', p.q) end as q_ts
    from params p
  ),
  policy_scoped as (
    select
      d.*,
      (
        pol.authorization_status = 'authorized_partner'
        and pol.content_reuse_policy = 'authorized'
        and pol.display_policy = 'partner_content'
        and pol.acquisition_mode in ('authorized_detail_feed', 'partner_feed')
        and pol.machine_gate in ('authorized_detail_feed', 'partner_feed')
        and pol.review_status in ('current', 'due_soon')
        and pol.no_bypass_required
      ) as rich_content_allowed,
      (
        pol.authorization_status not in ('prohibited', 'permission_required')
        and pol.content_reuse_policy not in ('prohibited', 'permission_required')
        and pol.display_policy = 'canonical_link_only'
        and pol.machine_gate = 'canonical_link_only'
        and pol.review_status in ('current', 'due_soon')
        and pol.no_bypass_required
        and tail.display_gate = 'external_tail_link_only'
        and tail.review_status = 'approved_existing_link_policy'
        and tail.manual_approval_required = false
      ) as external_minimal_allowed,
      to_tsvector(
        'simple',
        concat_ws(
          ' ',
          coalesce(d.canonical_url, ''),
          coalesce(d.source_domain, ''),
          coalesce(d.normalized_city, ''),
          coalesce(d.normalized_property_type, ''),
          coalesce(d.normalized_intent, '')
        )
      ) as minimal_search_vector
    from public.thin_index_search_documents d
    join public.source_policy_registry pol
      on pol.source_domain = d.source_domain
    left join public.source_external_tail_policy_v1 tail
      on tail.source_domain = d.source_domain
    where d.document_kind = 'LISTING'
      and d.display_eligibility in ('eligible_primary', 'eligible_secondary')
      and d.seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search')
      and d.freshness_status = 'fresh_confirmed'
      and nullif(btrim(d.canonical_url), '') is not null
  ),
  base as (
    select
      ps.*,
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
          and (ls.listing_url = ps.canonical_url or ls.source_url = ps.canonical_url)
      ), 3)::smallint as business_lane,
      0.12::real as freshness_boost,
      (
        (case when ps.normalized_city is not null then 0.015 else 0 end)
        + (case when ps.normalized_property_type is not null then 0.02 else 0 end)
        + (case when ps.normalized_intent is not null then 0.015 else 0 end)
        + (case when ps.rich_content_allowed and ps.normalized_price_mad is not null then 0.06 else 0 end)
        + (case when ps.rich_content_allowed and ps.normalized_surface_m2 is not null then 0.04 else 0 end)
      )::real as completeness_boost
    from policy_scoped ps
    cross join queries q
    where (ps.rich_content_allowed or ps.external_minimal_allowed)
      and (
        q.q_ts is null
        or (ps.rich_content_allowed and ps.search_vector @@ q.q_ts)
        or (ps.external_minimal_allowed and ps.minimal_search_vector @@ q.q_ts)
      )
      and (q.canonical_city is null or ps.normalized_city = q.canonical_city)
      and (q.canonical_property_type is null or ps.normalized_property_type = q.canonical_property_type)
      and (q.canonical_intent is null or ps.normalized_intent = q.canonical_intent)
      and (
        (
          ps.rich_content_allowed
          and (p_min_price is null or ps.normalized_price_mad >= p_min_price)
          and (p_max_price is null or ps.normalized_price_mad <= p_max_price)
          and (p_min_surface is null or ps.normalized_surface_m2 >= p_min_surface)
          and (p_max_surface is null or ps.normalized_surface_m2 <= p_max_surface)
        )
        or (
          ps.external_minimal_allowed
          and p_min_price is null
          and p_max_price is null
          and p_min_surface is null
          and p_max_surface is null
        )
      )
  ),
  exact_dedup as (
    select *
    from (
      select
        b.*,
        row_number() over (
          partition by lower(b.canonical_url)
          order by b.business_lane asc,
                   coalesce(b.quality_score, 0) desc,
                   b.updated_at desc,
                   b.seed_id desc
        ) as url_rank
      from base b
    ) x
    where x.url_rank = 1
  ),
  scored as (
    select
      d.*,
      (
        (case
          when q.q_ts is null then 0::real
          when d.rich_content_allowed then ts_rank_cd(d.search_vector, q.q_ts, 32)
          else ts_rank_cd(d.minimal_search_vector, q.q_ts, 32)
        end)
        + (case when d.rich_content_allowed then coalesce(d.ranking_quality_boost, 0::real) else 0::real end)
        + d.freshness_boost
        + d.completeness_boost
        + case when d.display_eligibility = 'eligible_primary' then 0.04::real else 0::real end
      )::real as base_score,
      row_number() over (
        partition by d.business_lane, d.source_domain
        order by
          (
            (case
              when q.q_ts is null then 0::real
              when d.rich_content_allowed then ts_rank_cd(d.search_vector, q.q_ts, 32)
              else ts_rank_cd(d.minimal_search_vector, q.q_ts, 32)
            end)
            + (case when d.rich_content_allowed then coalesce(d.ranking_quality_boost, 0::real) else 0::real end)
            + d.freshness_boost
            + d.completeness_boost
          ) desc,
          d.updated_at desc,
          d.seed_id desc
      ) as source_position
    from exact_dedup d
    cross join queries q
  ),
  ranked as (
    select
      s.*,
      greatest(
        0::real,
        s.base_score - least(0.12::real, greatest(0, s.source_position - 1)::real * 0.006::real)
      )::real as final_score
    from scored s
  ),
  counted as (
    select r.*, count(*) over () as total_count
    from ranked r
  ),
  page as (
    select c.*
    from counted c
    where p_after_lane is null
       or c.business_lane > p_after_lane
       or (c.business_lane = p_after_lane and p_after_rank is not null and c.final_score < p_after_rank)
       or (
         c.business_lane = p_after_lane
         and p_after_rank is not null
         and c.final_score = p_after_rank
         and p_after_updated_at is not null
         and c.updated_at < p_after_updated_at
       )
       or (
         c.business_lane = p_after_lane
         and p_after_rank is not null
         and c.final_score = p_after_rank
         and p_after_updated_at is not null
         and c.updated_at = p_after_updated_at
         and p_after_representation_id is not null
         and c.seed_id < p_after_representation_id
       )
    order by c.business_lane asc, c.final_score desc, c.updated_at desc, c.seed_id desc
    limit (select result_limit from queries)
  )
  select
    row_page.seed_id,
    row_page.canonical_url,
    row_page.source_domain,
    row_page.seed_provider,
    row_page.freshness_status,
    case
      when row_page.rich_content_allowed then row_page.title
      else concat_ws(
        ' · ',
        'Annonce immobilière',
        case row_page.normalized_intent
          when 'rent' then 'Location'
          when 'buy' then 'Vente'
          when 'new' then 'Neuf'
          else null
        end,
        nullif(initcap(replace(coalesce(row_page.normalized_property_type, ''), '_', ' ')), ''),
        nullif(initcap(coalesce(row_page.normalized_city, '')), '')
      )
    end as title,
    case when row_page.rich_content_allowed then row_page.snippet else null::text end as snippet,
    row_page.normalized_city,
    row_page.normalized_property_type,
    row_page.normalized_intent,
    case when row_page.rich_content_allowed then row_page.normalized_price_mad else null::numeric end as normalized_price_mad,
    case when row_page.rich_content_allowed then row_page.normalized_surface_m2 else null::numeric end as normalized_surface_m2,
    case when row_page.rich_content_allowed then row_page.price_per_m2_mad else null::numeric end as price_per_m2_mad,
    case when row_page.rich_content_allowed then row_page.quality_tier else null::text end as quality_tier,
    case when row_page.rich_content_allowed then row_page.quality_score else null::smallint end as quality_score,
    row_page.display_eligibility,
    case when row_page.rich_content_allowed then row_page.display_eligibility_reason else 'external_minimal_index'::text end as display_eligibility_reason,
    case when row_page.rich_content_allowed then row_page.ranking_quality_boost else 0::real end as ranking_quality_boost,
    row_page.updated_at,
    row_page.business_lane,
    row_page.final_score,
    row_page.total_count
  from page row_page;
end;
$function$;

-- The application invokes this RPC through getSupabaseServerClient/service_role.
-- Direct Data API execution would expose a privileged SECURITY DEFINER surface.
revoke all on function public.search_public_representations_v2(
  text, text, text, text, numeric, numeric, numeric, numeric,
  integer, smallint, real, timestamptz, uuid
) from PUBLIC, anon, authenticated;

grant execute on function public.search_public_representations_v2(
  text, text, text, text, numeric, numeric, numeric, numeric,
  integer, smallint, real, timestamptz, uuid
) to service_role;
