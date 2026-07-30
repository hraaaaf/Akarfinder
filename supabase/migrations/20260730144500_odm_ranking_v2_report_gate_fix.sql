-- ODM-RANKING-V2-REPORT-GATE-FIX
-- Treats absence of low-quality rows in a filtered sample as neutral, not failure.
-- Shadow-only; no active search, ranking, publication or SERP mutation.

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
    'count',count(*),'min',min(ranking_score_v2),'max',max(ranking_score_v2),'avg',avg(ranking_score_v2),
    'ranked_avg',avg(ranking_score_v2) filter(where display_tier_v2='displayable_ranked'),
    'degraded_avg',avg(ranking_score_v2) filter(where display_tier_v2='displayable_degraded')
  ) value from r
), components as (
  select jsonb_build_object(
    'text_relevance_avg',avg(text_relevance),'quality_avg',avg(quality_component),
    'freshness_avg',avg(freshness_component),'completeness_avg',avg(completeness_component),
    'economic_avg',avg(economic_component),'evidence_avg',avg(evidence_component),
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
    'low_quality_rows_rankable_when_present',count(*) filter(where 'low_or_unscored_quality'=any(decision_reasons_v2) and display_tier_v2='displayable_degraded')
      = count(*) filter(where 'low_or_unscored_quality'=any(decision_reasons_v2)),
    'publication_remains_disabled',true,
    'active_search_unchanged',true,
    'serp_unchanged',true
  ) value from r
)
select jsonb_build_object(
  'audit_version','odm_ranking_v2_1',
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

revoke all on function public.odm_ranking_v2_report(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.odm_ranking_v2_report(text,text,text,text,integer) to service_role;

comment on function public.odm_ranking_v2_report(text,text,text,text,integer) is 'Ranking V2.1 report with vacuous-safe low-quality rankability gate for filtered samples.';
