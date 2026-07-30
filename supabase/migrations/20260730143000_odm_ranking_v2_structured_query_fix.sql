-- ODM-RANKING-V2-STRUCTURED-QUERY-FIX
-- Structured filters define eligibility; free text remains a relevance signal when filters are present.
-- Shadow-only; active search and SERP remain unchanged.

create or replace function public.search_odm_ranking_shadow_v2(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_limit integer default 100
)
returns table(
  observation_id text,seed_id uuid,canonical_url text,source_domain text,title text,snippet text,
  normalized_city text,normalized_property_type text,normalized_intent text,
  normalized_price_mad numeric,normalized_surface_m2 numeric,display_tier_v2 text,
  decision_reasons_v2 text[],lane_weight smallint,text_relevance real,quality_component real,
  freshness_component real,completeness_component real,economic_component real,evidence_component real,
  degradation_penalty real,ranking_score_v2 real,ranking_policy_version text
)
language sql
stable
security invoker
set search_path=''
as $$
with params as (
  select
    nullif(btrim(p_query),'') as q,
    public.odm04_normalize_city(nullif(btrim(p_city),'')) as city,
    public.odm04_normalize_property_type(nullif(btrim(p_property_type),'')) as property_type,
    public.odm04_normalize_intent(nullif(btrim(p_intent),'')) as intent,
    least(greatest(coalesce(p_limit,100),1),500) as result_limit
), q as (
  select p.*,case when p.q is null then null else websearch_to_tsquery('simple',p.q) end as q_ts
  from params p
), scored as (
  select
    v.*,
    case when v.display_tier_v2='displayable_ranked' then 0::smallint else 1::smallint end as lane_weight,
    (case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector,q.q_ts,32) end)::real as text_relevance,
    least(0.18::real,greatest(0::real,coalesce(v.quality_score,0)::real/555::real)) as quality_component,
    case v.freshness_status_v2 when 'fresh' then 0.18::real when 'aging' then 0.10::real when 'stale' then 0.02::real else 0::real end as freshness_component,
    ((case when v.normalized_city is not null then 0.04 else 0 end)
      +(case when v.normalized_property_type is not null then 0.04 else 0 end)
      +(case when v.normalized_intent is not null then 0.04 else 0 end)
      +(case when v.normalized_price_mad is not null or v.recovered_value_mad is not null then 0.04 else 0 end)
      +(case when v.normalized_surface_m2 is not null then 0.04 else 0 end))::real as completeness_component,
    case coalesce(v.economic_status,'missing') when 'trusted' then 0.15::real when 'missing' then 0.03::real when 'stale' then 0.01::real else 0::real end as economic_component,
    case when v.has_exploitable_evidence then 0.08::real else 0::real end as evidence_component,
    least(0.20::real,(case when v.display_tier_v2='displayable_degraded' then 0.06 else 0 end)+cardinality(v.decision_reasons_v2)::real*0.02::real) as degradation_penalty
  from public.odm_display_policy_shadow_v2 v
  join public.thin_index_search_documents d on d.seed_id=v.seed_id
  cross join q
  where v.display_tier_v2 in ('displayable_ranked','displayable_degraded')
    and (
      q.q_ts is null
      or d.search_vector @@ q.q_ts
      or q.city is not null
      or q.property_type is not null
      or q.intent is not null
    )
    and (q.city is null or v.normalized_city=q.city)
    and (q.property_type is null or v.normalized_property_type=q.property_type)
    and (q.intent is null or v.normalized_intent=q.intent)
), ranked as (
  select s.*,greatest(0::real,least(1.50::real,
    s.text_relevance+s.quality_component+s.freshness_component+s.completeness_component+
    s.economic_component+s.evidence_component-s.degradation_penalty
  ))::real as ranking_score_v2
  from scored s
)
select observation_id,seed_id,canonical_url,source_domain,observation_title,observation_snippet,
  normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2,
  display_tier_v2,decision_reasons_v2,lane_weight,text_relevance,quality_component,freshness_component,
  completeness_component,economic_component,evidence_component,degradation_penalty,ranking_score_v2,
  'odm_ranking_v2_1_structured_query'::text
from ranked
order by lane_weight asc,ranking_score_v2 desc,observation_observed_at desc nulls last,seed_id desc
limit (select result_limit from q);
$$;

revoke all on function public.search_odm_ranking_shadow_v2(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.search_odm_ranking_shadow_v2(text,text,text,text,integer) to service_role;

comment on function public.search_odm_ranking_shadow_v2(text,text,text,text,integer) is 'Shadow Ranking V2.1: structured filters define eligibility while free text contributes relevance; query-only searches still require a text match.';
