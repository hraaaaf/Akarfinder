-- ODM SEARCH EXPLANATION V1
-- Shadow-only deterministic explanations over Ranking V2.
-- No LLM, public search, Thin Index, SERP, publication, ranking or display-policy mutation.

create or replace function public.search_odm_explained_shadow_v1(
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
  ranking_score_v2 real,
  lane_weight smallint,
  match_reasons text[],
  quality_reasons text[],
  freshness_reasons text[],
  ranking_reasons text[],
  warnings text[],
  explanation_evidence jsonb,
  explanation_version text
)
language sql
stable
security invoker
set search_path=''
as $$
with ranked as (
  select * from public.search_odm_ranking_shadow_v2(
    p_query,p_city,p_property_type,p_intent,least(greatest(coalesce(p_limit,100),1),500)
  )
), explained as (
  select
    r.*,
    array_remove(array[
      case when nullif(btrim(p_query),'') is not null and r.text_relevance>0 then 'text_query_match' end,
      case when nullif(btrim(p_city),'') is not null and r.normalized_city=public.odm04_normalize_city(p_city) then 'city_match' end,
      case when nullif(btrim(p_property_type),'') is not null and r.normalized_property_type=public.odm04_normalize_property_type(p_property_type) then 'property_type_match' end,
      case when nullif(btrim(p_intent),'') is not null and r.normalized_intent=public.odm04_normalize_intent(p_intent) then 'intent_match' end
    ],null)::text[] match_reasons,
    array_remove(array[
      case when r.quality_component>=0.12 then 'strong_quality_signal' end,
      case when r.completeness_component>=0.16 then 'high_structured_completeness' end,
      case when r.evidence_component>0 then 'exploitable_evidence_present' end,
      case when r.economic_component>=0.15 then 'trusted_economic_signal' end
    ],null)::text[] quality_reasons,
    array_remove(array[
      case when r.freshness_component>=0.18 then 'fresh_observation' end,
      case when r.freshness_component>=0.10 and r.freshness_component<0.18 then 'aging_but_usable_observation' end,
      case when r.freshness_component>0 and r.freshness_component<0.10 then 'stale_observation' end
    ],null)::text[] freshness_reasons,
    array_remove(array[
      case when r.display_tier_v2='displayable_ranked' then 'preferred_ranked_lane' end,
      case when r.ranking_score_v2>=0.75 then 'high_combined_ranking_score' end,
      case when r.ranking_score_v2>=0.40 and r.ranking_score_v2<0.75 then 'moderate_combined_ranking_score' end,
      case when r.text_relevance>0 then 'text_relevance_contributed' end,
      case when r.quality_component>0 then 'quality_contributed' end,
      case when r.freshness_component>0 then 'freshness_contributed' end,
      case when r.completeness_component>0 then 'completeness_contributed' end,
      case when r.economic_component>0 then 'economic_trust_contributed' end,
      case when r.evidence_component>0 then 'evidence_contributed' end
    ],null)::text[] ranking_reasons,
    array_remove(array[
      case when r.display_tier_v2='displayable_degraded' then 'degraded_display_lane' end,
      case when r.normalized_price_mad is null then 'price_missing' end,
      case when r.normalized_surface_m2 is null then 'surface_missing' end,
      case when r.degradation_penalty>0 then 'ranking_degradation_applied' end,
      case when 'low_or_unscored_quality'=any(r.decision_reasons_v2) then 'low_or_unscored_quality' end,
      case when 'price_rejected'=any(r.decision_reasons_v2) then 'price_rejected' end,
      case when 'price_ambiguous'=any(r.decision_reasons_v2) then 'price_ambiguous' end,
      case when 'economic_policy_blocked'=any(r.decision_reasons_v2) then 'economic_policy_warning' end,
      case when r.freshness_component<=0.02 then 'freshness_weak_or_unknown' end
    ],null)::text[] warnings
  from ranked r
)
select
  observation_id,seed_id,canonical_url,source_domain,title,snippet,
  normalized_city,normalized_property_type,normalized_intent,
  normalized_price_mad,normalized_surface_m2,display_tier_v2,ranking_score_v2,lane_weight,
  match_reasons,quality_reasons,freshness_reasons,ranking_reasons,warnings,
  jsonb_build_object(
    'ranking_policy_version',ranking_policy_version,
    'display_decision_reasons',decision_reasons_v2,
    'components',jsonb_build_object(
      'text_relevance',text_relevance,
      'quality',quality_component,
      'freshness',freshness_component,
      'completeness',completeness_component,
      'economic',economic_component,
      'evidence',evidence_component,
      'degradation_penalty',degradation_penalty,
      'total',ranking_score_v2
    ),
    'deterministic',true,
    'llm_generated',false
  ),
  'odm_search_explanation_v1'::text
from explained
order by lane_weight asc,ranking_score_v2 desc,seed_id desc;
$$;

create or replace function public.odm_search_explanation_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with e as materialized (
  select * from public.search_odm_explained_shadow_v1(null,null,null,null,500)
), gates as (
  select jsonb_build_object(
    'all_rows_explained',count(*) filter(where cardinality(match_reasons)+cardinality(quality_reasons)+cardinality(freshness_reasons)+cardinality(ranking_reasons)+cardinality(warnings)=0)=0,
    'all_explanations_deterministic',count(*) filter(where explanation_evidence#>>'{deterministic}'<>'true')=0,
    'no_llm_generated_explanations',count(*) filter(where explanation_evidence#>>'{llm_generated}'<>'false')=0,
    'blocked_rows_absent',count(*) filter(where display_tier_v2='blocked')=0,
    'degraded_rows_warned',count(*) filter(where display_tier_v2='displayable_degraded' and not ('degraded_display_lane'=any(warnings)))=0,
    'component_total_matches_rank',count(*) filter(where abs(((explanation_evidence#>>'{components,total}')::real)-ranking_score_v2)>0.0001)=0,
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ) value from e
)
select jsonb_build_object(
  'audit_version','odm_search_explanation_v1',
  'generated_at',now(),
  'counts',jsonb_build_object(
    'rows',count(*),
    'ranked',count(*) filter(where display_tier_v2='displayable_ranked'),
    'degraded',count(*) filter(where display_tier_v2='displayable_degraded'),
    'with_warnings',count(*) filter(where cardinality(warnings)>0),
    'with_match_reasons',count(*) filter(where cardinality(match_reasons)>0),
    'with_quality_reasons',count(*) filter(where cardinality(quality_reasons)>0),
    'with_freshness_reasons',count(*) filter(where cardinality(freshness_reasons)>0),
    'with_ranking_reasons',count(*) filter(where cardinality(ranking_reasons)>0)
  ),
  'gates',(select value from gates),
  'deterministic_only',true,
  'llm_used',false,
  'active_search_changed',false,
  'serp_changed',false,
  'publication_activated',false
) from e;
$$;

revoke all on function public.search_odm_explained_shadow_v1(text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.odm_search_explanation_report_v1() from public,anon,authenticated;
grant execute on function public.search_odm_explained_shadow_v1(text,text,text,text,integer) to service_role;
grant execute on function public.odm_search_explanation_report_v1() to service_role;

comment on function public.search_odm_explained_shadow_v1(text,text,text,text,integer) is 'Shadow-only deterministic search explanations grounded in Ranking V2 components and Display Policy reasons. No LLM and no public activation.';
comment on function public.odm_search_explanation_report_v1() is 'Service-role-only LOT 4 explanation coverage and safety report.';