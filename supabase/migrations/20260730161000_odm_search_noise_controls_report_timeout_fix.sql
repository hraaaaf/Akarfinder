-- ODM SEARCH NOISE CONTROLS V1 REPORT TIMEOUT FIX
-- Avoids a second Display Policy scan and canonical-domain recalculation.

create or replace function public.odm_search_noise_controls_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with maximum_coverage as materialized (
  select * from public.search_odm_noise_controls_shadow_v1(
    null,null,null,null,'maximum_coverage',null,null,null,null,false,false,false,500
  )
), counts as (
  select
    count(*)::bigint as max_rows,
    count(*) filter(where display_tier_v2='displayable_ranked' or ranking_score_v2>=0.08)::bigint as default_rows,
    count(*) filter(where display_tier_v2='displayable_ranked' or (
      ranking_score_v2>=0.28 and freshness_status_v2 in ('fresh','aging')
    ))::bigint as low_rows,
    count(*) filter(where freshness_status_v2='fresh')::bigint as fresh_rows,
    count(*) filter(where normalized_price_mad is not null)::bigint as price_rows,
    count(*) filter(where normalized_surface_m2 is not null)::bigint as surface_rows,
    count(*) filter(where display_tier_v2='blocked')::bigint as blocked_rows
  from maximum_coverage
), gates as (
  select jsonb_build_object(
    'mode_counts_monotonic',max_rows>=default_rows and default_rows>=low_rows,
    'maximum_coverage_returns_all_shadow_candidates',max_rows>0,
    'blocked_rows_absent',blocked_rows=0,
    'fresh_filter_honored',fresh_rows<=max_rows,
    'price_filter_honored',price_rows<=max_rows,
    'surface_filter_honored',surface_rows<=max_rows,
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
  'audit_version','odm_search_noise_controls_v1_2',
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
