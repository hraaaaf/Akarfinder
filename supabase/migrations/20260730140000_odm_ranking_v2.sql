-- ODM-RANKING-V2
-- Search-first Shadow ranking over Display Policy V2.
-- No public search function, Thin Index row, display eligibility, SERP or publication mutation.
-- Rollback: drop function public.odm_ranking_v2_report(text,text,text,text,integer); drop function public.search_odm_ranking_shadow_v2(text,text,text,text,integer);

create or replace function public.search_odm_ranking_shadow_v2(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_limit integer default 100
)
returns table(
  observation_id text,
  seed_id uuid,
  canonical_url text,
  source_domain text,
  title text,
  snippet text,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  normalized_price_mad numeric,
  normalized_surface_m2 numeric,
  display_tier_v2 text,
  decision_reasons_v2 text[],
  lane_weight smallint,
  text_relevance real,
  quality_component real,
  freshness_component real,
  completeness_component real,
  economic_component real,
  evidence_component real,
  degradation_penalty real,
  ranking_score_v2 real,
  ranking_policy_version text
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
  select p.*, case when p.q is null then null else websearch_to_tsquery('simple',p.q) end as q_ts
  from params p
), scored as (
  select
    v.*,
    case when v.display_tier_v2='displayable_ranked' then 0::smallint else 1::smallint end as lane_weight,
    (case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector,q.q_ts,32) end)::real as text_relevance,
    least(0.18::real,greatest(0::real,coalesce(v.quality_score,0)::real/555::real)) as quality_component,
    case v.freshness_status_v2
      when 'fresh' then 0.18::real
      when 'aging' then 0.10::real
      when 'stale' then 0.02::real
      else 0::real
    end as freshness_component,
    ((case when v.normalized_city is not null then 0.04 else 0 end)
      +(case when v.normalized_property_type is not null then 0.04 else 0 end)
      +(case when v.normalized_intent is not null then 0.04 else 0 end)
      +(case when v.normalized_price_mad is not null or v.recovered_value_mad is not null then 0.04 else 0 end)
      +(case when v.normalized_surface_m2 is not null then 0.04 else 0 end))::real as completeness_component,
    case coalesce(v.economic_status,'missing')
      when 'trusted' then 0.15::real
      when 'missing' then 0.03::real
      when 'stale' then 0.01::real
      else 0::real
    end as economic_component,
    case when v.has_exploitable_evidence then 0.08::real else 0::real end as evidence_component,
    least(0.20::real,
      (case when v.display_tier_v2='displayable_degraded' then 0.06 else 0 end)
      + cardinality(v.decision_reasons_v2)::real*0.02::real
    ) as degradation_penalty
  from public.odm_display_policy_shadow_v2 v
  join public.thin_index_search_documents d on d.seed_id=v.seed_id
  cross join q
  where v.display_tier_v2 in ('displayable_ranked','displayable_degraded')
    and (q.q_ts is null or d.search_vector @@ q.q_ts)
    and (q.city is null or v.normalized_city=q.city)
    and (q.property_type is null or v.normalized_property_type=q.property_type)
    and (q.intent is null or v.normalized_intent=q.intent)
), ranked as (
  select s.*,
    greatest(0::real,least(1.50::real,
      s.text_relevance
      + s.quality_component
      + s.freshness_component
      + s.completeness_component
      + s.economic_component
      + s.evidence_component
      - s.degradation_penalty
    ))::real as ranking_score_v2
  from scored s
)
select
  observation_id,seed_id,canonical_url,source_domain,observation_title,observation_snippet,
  normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,normalized_surface_m2,
  display_tier_v2,decision_reasons_v2,lane_weight,text_relevance,quality_component,freshness_component,
  completeness_component,economic_component,evidence_component,degradation_penalty,ranking_score_v2,
  'odm_ranking_v2'::text
from ranked
order by lane_weight asc, ranking_score_v2 desc, observation_observed_at desc nulls last, seed_id desc
limit (select result_limit from q);
$$;

create or replace function public.odm_ranking_v2_report(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_limit integer default 500
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with r as (
  select * from public.search_odm_ranking_shadow_v2(p_query,p_city,p_property_type,p_intent,p_limit)
), distribution as (
  select coalesce(jsonb_object_agg(display_tier_v2,n),'{}'::jsonb) value
  from (select display_tier_v2,count(*)::bigint n from r group by display_tier_v2) x
), score_stats as (
  select jsonb_build_object(
    'count',count(*),
    'min',min(ranking_score_v2),
    'max',max(ranking_score_v2),
    'avg',avg(ranking_score_v2),
    'ranked_avg',avg(ranking_score_v2) filter(where display_tier_v2='displayable_ranked'),
    'degraded_avg',avg(ranking_score_v2) filter(where display_tier_v2='displayable_degraded')
  ) value from r
), components as (
  select jsonb_build_object(
    'text_relevance_avg',avg(text_relevance),
    'quality_avg',avg(quality_component),
    'freshness_avg',avg(freshness_component),
    'completeness_avg',avg(completeness_component),
    'economic_avg',avg(economic_component),
    'evidence_avg',avg(evidence_component),
    'penalty_avg',avg(degradation_penalty)
  ) value from r
), by_source as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.top_score desc,x.source_domain),'[]'::jsonb) value
  from (
    select source_domain,count(*)::bigint rows,max(ranking_score_v2) top_score,avg(ranking_score_v2) avg_score
    from r group by source_domain
  ) x
), gates as (
  select jsonb_build_object(
    'blocked_rows_absent',count(*) filter(where display_tier_v2='blocked')=0,
    'ranked_lane_precedes_degraded',coalesce(max(lane_weight) filter(where display_tier_v2='displayable_ranked'),0)=0
      and coalesce(min(lane_weight) filter(where display_tier_v2='displayable_degraded'),1)=1,
    'all_scores_bounded',count(*) filter(where ranking_score_v2<0 or ranking_score_v2>1.5)=0,
    'all_degraded_penalized',count(*) filter(where display_tier_v2='displayable_degraded' and degradation_penalty<=0)=0,
    'low_quality_not_hard_excluded',count(*) filter(where 'low_or_unscored_quality'=any(decision_reasons_v2))>0
      or count(*) filter(where display_tier_v2='displayable_degraded')=0,
    'publication_remains_disabled',true,
    'active_search_unchanged',true,
    'serp_unchanged',true
  ) value from r
)
select jsonb_build_object(
  'audit_version','odm_ranking_v2',
  'generated_at',now(),
  'query',p_query,
  'filters',jsonb_build_object('city',p_city,'property_type',p_property_type,'intent',p_intent),
  'distribution',(select value from distribution),
  'score_stats',(select value from score_stats),
  'component_averages',(select value from components),
  'by_source',(select value from by_source),
  'gates',(select value from gates),
  'publication_activated',false,
  'active_search_changed',false,
  'serp_changed',false
);
$$;

revoke all on function public.search_odm_ranking_shadow_v2(text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.odm_ranking_v2_report(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.search_odm_ranking_shadow_v2(text,text,text,text,integer) to service_role;
grant execute on function public.odm_ranking_v2_report(text,text,text,text,integer) to service_role;

comment on function public.search_odm_ranking_shadow_v2(text,text,text,text,integer) is 'Shadow-only Ranking V2. Ranked and degraded lanes remain searchable; blocked rows are excluded. No public activation.';
comment on function public.odm_ranking_v2_report(text,text,text,text,integer) is 'Service-role-only Ranking V2 distribution, score-components and safety gates.';
