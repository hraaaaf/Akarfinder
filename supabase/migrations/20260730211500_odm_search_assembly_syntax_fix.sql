-- ODM SEARCH ASSEMBLY SYNTAX FIX
-- Corrects the missing closing parenthesis in the single-pass low-noise predicate.

create or replace function public.search_odm_assembled_shadow_v1(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_mode text default 'default',
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_surface numeric default null,
  p_max_surface numeric default null,
  p_fresh_only boolean default false,
  p_require_price boolean default false,
  p_require_surface boolean default false,
  p_limit integer default 100
)
returns table(
  observation_id text, seed_id uuid, canonical_url text, source_domain text,
  title text, snippet text, normalized_city text, normalized_property_type text,
  normalized_intent text, normalized_price_mad numeric, normalized_surface_m2 numeric,
  freshness_status_v2 text, display_tier_v2 text, ranking_score_v2 real,
  lane_weight smallint, applied_mode text, noise_control_reasons text[],
  match_reasons text[], quality_reasons text[], freshness_reasons text[],
  ranking_reasons text[], warnings text[], explanation_evidence jsonb,
  assembly_metadata jsonb, assembly_version text
)
language sql stable security invoker set search_path=''
as $$
with params as (
  select case when p_mode in ('default','maximum_coverage','low_noise') then p_mode else 'default' end mode,
         least(greatest(coalesce(p_limit,100),1),500) result_limit
), ranked as materialized (
  select r.*,v.freshness_status_v2,v.economic_status,v.has_exploitable_evidence
  from public.search_odm_ranking_shadow_v2(p_query,p_city,p_property_type,p_intent,500) r
  join public.odm_display_policy_shadow_v2 v using(observation_id)
), filtered as (
  select r.*,p.mode,
    array_remove(array[
      case when p_min_price is not null then 'min_price' end,
      case when p_max_price is not null then 'max_price' end,
      case when p_min_surface is not null then 'min_surface' end,
      case when p_max_surface is not null then 'max_surface' end,
      case when p_fresh_only then 'fresh_only' end,
      case when p_require_price then 'require_price' end,
      case when p_require_surface then 'require_surface' end
    ],null)::text[] control_reasons
  from ranked r cross join params p
  where (p_min_price is null or r.normalized_price_mad>=p_min_price)
    and (p_max_price is null or r.normalized_price_mad<=p_max_price)
    and (p_min_surface is null or r.normalized_surface_m2>=p_min_surface)
    and (p_max_surface is null or r.normalized_surface_m2<=p_max_surface)
    and (not p_fresh_only or r.freshness_status_v2='fresh')
    and (not p_require_price or r.normalized_price_mad is not null)
    and (not p_require_surface or r.normalized_surface_m2 is not null)
    and (
      p.mode='maximum_coverage'
      or (p.mode='default' and (r.display_tier_v2='displayable_ranked' or r.ranking_score_v2>=0.08))
      or (p.mode='low_noise' and (
        r.display_tier_v2='displayable_ranked'
        or (r.ranking_score_v2>=0.28 and r.freshness_status_v2 in ('fresh','aging')
          and r.has_exploitable_evidence
          and not ('low_or_unscored_quality'=any(r.decision_reasons_v2))
          and not ('price_rejected'=any(r.decision_reasons_v2))
          and not ('price_ambiguous'=any(r.decision_reasons_v2))
          and not ('economic_policy_blocked'=any(r.decision_reasons_v2))))
      )
    )
), explained as (
  select f.*,
    array_remove(array[
      case when nullif(btrim(p_query),'') is not null and f.text_relevance>0 then 'text_query_match' end,
      case when nullif(btrim(p_city),'') is not null and f.normalized_city=public.odm04_normalize_city(p_city) then 'city_match' end,
      case when nullif(btrim(p_property_type),'') is not null and f.normalized_property_type=public.odm04_normalize_property_type(p_property_type) then 'property_type_match' end,
      case when nullif(btrim(p_intent),'') is not null and f.normalized_intent=public.odm04_normalize_intent(p_intent) then 'intent_match' end
    ],null)::text[] match_reasons,
    array_remove(array[
      case when f.quality_component>=0.12 then 'strong_quality_signal' end,
      case when f.completeness_component>=0.16 then 'high_structured_completeness' end,
      case when f.evidence_component>0 then 'exploitable_evidence_present' end,
      case when f.economic_component>=0.15 then 'trusted_economic_signal' end
    ],null)::text[] quality_reasons,
    array_remove(array[
      case when f.freshness_component>=0.18 then 'fresh_observation' end,
      case when f.freshness_component>=0.10 and f.freshness_component<0.18 then 'aging_but_usable_observation' end,
      case when f.freshness_component>0 and f.freshness_component<0.10 then 'stale_observation' end
    ],null)::text[] freshness_reasons,
    array_remove(array[
      case when f.display_tier_v2='displayable_ranked' then 'preferred_ranked_lane' end,
      case when f.ranking_score_v2>=0.75 then 'high_combined_ranking_score' end,
      case when f.ranking_score_v2>=0.40 and f.ranking_score_v2<0.75 then 'moderate_combined_ranking_score' end,
      case when f.text_relevance>0 then 'text_relevance_contributed' end,
      case when f.quality_component>0 then 'quality_contributed' end,
      case when f.freshness_component>0 then 'freshness_contributed' end,
      case when f.completeness_component>0 then 'completeness_contributed' end,
      case when f.economic_component>0 then 'economic_trust_contributed' end,
      case when f.evidence_component>0 then 'evidence_contributed' end
    ],null)::text[] ranking_reasons,
    array_remove(array[
      case when f.display_tier_v2='displayable_degraded' then 'degraded_display_lane' end,
      case when f.normalized_price_mad is null then 'price_missing' end,
      case when f.normalized_surface_m2 is null then 'surface_missing' end,
      case when f.degradation_penalty>0 then 'ranking_degradation_applied' end,
      case when 'low_or_unscored_quality'=any(f.decision_reasons_v2) then 'low_or_unscored_quality' end,
      case when 'price_rejected'=any(f.decision_reasons_v2) then 'price_rejected' end,
      case when 'price_ambiguous'=any(f.decision_reasons_v2) then 'price_ambiguous' end,
      case when 'economic_policy_blocked'=any(f.decision_reasons_v2) then 'economic_policy_warning' end,
      case when f.freshness_component<=0.02 then 'freshness_weak_or_unknown' end
    ],null)::text[] warnings
  from filtered f
)
select
  observation_id,seed_id,canonical_url,source_domain,title,snippet,
  normalized_city,normalized_property_type,normalized_intent,
  normalized_price_mad,normalized_surface_m2,freshness_status_v2,
  display_tier_v2,ranking_score_v2,lane_weight,mode,control_reasons,
  match_reasons,quality_reasons,freshness_reasons,ranking_reasons,warnings,
  jsonb_build_object(
    'ranking_policy_version',ranking_policy_version,
    'display_decision_reasons',decision_reasons_v2,
    'components',jsonb_build_object(
      'text_relevance',text_relevance,'quality',quality_component,
      'freshness',freshness_component,'completeness',completeness_component,
      'economic',economic_component,'evidence',evidence_component,
      'degradation_penalty',degradation_penalty,'total',ranking_score_v2),
    'deterministic',true,'llm_generated',false),
  jsonb_build_object(
    'shadow_only',true,'public_activation',false,
    'display_policy_version','odm_display_policy_v2',
    'ranking_version','odm_ranking_v2',
    'noise_controls_version','odm_search_noise_controls_v1',
    'explanation_version','odm_search_explanation_v1',
    'capabilities',public.odm_search_control_capabilities_v1()),
  'odm_search_assembly_v1'::text
from explained
order by lane_weight asc,ranking_score_v2 desc,seed_id desc
limit (select result_limit from params);
$$;

comment on function public.search_odm_assembled_shadow_v1(text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,integer) is 'Single-pass Shadow Search Assembly with corrected low-noise predicate syntax.';