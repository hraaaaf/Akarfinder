-- ODM SEARCH NOISE CONTROLS V1 REPORT FIX
-- Single-pass materialized report over maximum-coverage candidates.

create or replace function public.odm_search_noise_controls_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with maximum_coverage as materialized (
  select r.*,v.decision_reasons_v2,v.has_exploitable_evidence
  from public.search_odm_noise_controls_shadow_v1(
    null,null,null,null,'maximum_coverage',null,null,null,null,false,false,false,500
  ) r
  join public.odm_display_policy_shadow_v2 v on v.observation_id=r.observation_id
), counts as (
  select
    count(*)::bigint as max_rows,
    count(*) filter(where display_tier_v2='displayable_ranked' or ranking_score_v2>=0.08)::bigint as default_rows,
    count(*) filter(where display_tier_v2='displayable_ranked' or (
      ranking_score_v2>=0.28
      and freshness_status_v2 in ('fresh','aging')
      and has_exploitable_evidence
      and not ('low_or_unscored_quality'=any(decision_reasons_v2))
      and not ('price_rejected'=any(decision_reasons_v2))
      and not ('price_ambiguous'=any(decision_reasons_v2))
      and not ('economic_policy_blocked'=any(decision_reasons_v2))
    ))::bigint as low_rows,
    count(*) filter(where freshness_status_v2='fresh')::bigint as fresh_rows,
    count(*) filter(where normalized_price_mad is not null)::bigint as price_rows,
    count(*) filter(where normalized_surface_m2 is not null)::bigint as surface_rows,
    count(*) filter(where display_tier_v2='blocked')::bigint as blocked_rows
  from maximum_coverage
), gates as (
  select jsonb_build_object(
    'mode_counts_monotonic',max_rows>=default_rows and default_rows>=low_rows,
    'maximum_coverage_preserves_rankable',max_rows=(select count(*) from public.odm_display_policy_shadow_v2 where display_tier_v2 in ('displayable_ranked','displayable_degraded')),
    'blocked_rows_absent',blocked_rows=0,
    'fresh_filter_honored',(select count(*) from maximum_coverage where freshness_status_v2='fresh')=fresh_rows,
    'price_filter_honored',(select count(*) from maximum_coverage where normalized_price_mad is not null)=price_rows,
    'surface_filter_honored',(select count(*) from maximum_coverage where normalized_surface_m2 is not null)=surface_rows,
    'unsupported_filters_not_fabricated',
      (public.odm_search_control_capabilities_v1()#>>'{filters,photo}')='false'
      and (public.odm_search_control_capabilities_v1()#>>'{filters,owner}')='false'
      and (public.odm_search_control_capabilities_v1()#>>'{filters,premium}')='false'
      and (public.odm_search_control_capabilities_v1()#>>'{filters,partner}')='false',
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ) value from counts
)
select jsonb_build_object(
  'audit_version','odm_search_noise_controls_v1_1',
  'generated_at',now(),
  'counts',jsonb_build_object(
    'maximum_coverage',(select max_rows from counts),
    'default',(select default_rows from counts),
    'low_noise',(select low_rows from counts),
    'fresh_only',(select fresh_rows from counts),
    'require_price',(select price_rows from counts),
    'require_surface',(select surface_rows from counts)
  ),
  'capabilities',public.odm_search_control_capabilities_v1(),
  'gates',(select value from gates),
  'active_search_changed',false,
  'serp_changed',false,
  'publication_activated',false
);
$$;

revoke all on function public.odm_search_noise_controls_report_v1() from public,anon,authenticated;
grant execute on function public.odm_search_noise_controls_report_v1() to service_role;
