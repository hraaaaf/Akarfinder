-- ODM FINAL RELEASE GATE V1
-- Evaluates release readiness over a bounded Shadow sample. Never activates public search.

create or replace function public.odm_final_release_gate_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with assembled as materialized (
  select * from public.search_odm_assembled_shadow_v1(
    null,null,null,null,'maximum_coverage',null,null,null,null,false,false,false,100
  )
), metrics as (
  select
    count(*) as total_rows,
    count(*) filter(where normalized_city is not null) as city_rows,
    count(*) filter(where normalized_city is not null and normalized_property_type is not null and normalized_intent is not null) as fully_structured_rows,
    count(*) filter(where normalized_price_mad is not null) as price_rows,
    count(*) filter(where normalized_surface_m2 is not null) as surface_rows,
    count(*) filter(where display_tier_v2='displayable_ranked') as ranked_rows,
    count(*) filter(where display_tier_v2='displayable_degraded') as degraded_rows,
    count(*) filter(where display_tier_v2='blocked') as blocked_rows,
    count(distinct normalized_city) filter(where normalized_city in ('Casablanca','Rabat','Marrakech','Agadir','Fès','Tanger','Kénitra')) as priority_cities_covered,
    count(*) filter(where assembly_metadata#>>'{shadow_only}'<>'true') as non_shadow_rows,
    count(*) filter(where assembly_metadata#>>'{public_activation}'<>'false') as public_activation_rows
  from assembled
), evaluated as (
  select *,
    round(100.0*fully_structured_rows/nullif(total_rows,0),2) as structured_percent,
    round(100.0*price_rows/nullif(total_rows,0),2) as price_coverage_percent,
    round(100.0*surface_rows/nullif(total_rows,0),2) as surface_coverage_percent,
    round(100.0*ranked_rows/nullif(total_rows,0),2) as ranked_share_percent
  from metrics
)
select jsonb_build_object(
  'audit_version','odm_final_release_gate_v1',
  'generated_at',now(),
  'audit_window',100,
  'thresholds',jsonb_build_object(
    'priority_cities_min',7,
    'structured_percent_min',80,
    'price_coverage_percent_min',70,
    'surface_coverage_percent_min',70,
    'ranked_share_percent_min',30
  ),
  'metrics',jsonb_build_object(
    'total_rows',total_rows,
    'city_rows',city_rows,
    'priority_cities_covered',priority_cities_covered,
    'fully_structured_rows',fully_structured_rows,
    'structured_percent',structured_percent,
    'price_coverage_percent',price_coverage_percent,
    'surface_coverage_percent',surface_coverage_percent,
    'ranked_rows',ranked_rows,
    'degraded_rows',degraded_rows,
    'ranked_share_percent',ranked_share_percent
  ),
  'gates',jsonb_build_object(
    'priority_city_depth',priority_cities_covered>=7,
    'structured_depth',structured_percent>=80,
    'price_depth',price_coverage_percent>=70,
    'surface_depth',surface_coverage_percent>=70,
    'ranked_depth',ranked_share_percent>=30,
    'blocked_rows_absent',blocked_rows=0,
    'all_rows_shadow_only',non_shadow_rows=0,
    'public_activation_disabled',public_activation_rows=0,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ),
  'release_ready',(
    priority_cities_covered>=7
    and structured_percent>=80
    and price_coverage_percent>=70
    and surface_coverage_percent>=70
    and ranked_share_percent>=30
    and blocked_rows=0
    and non_shadow_rows=0
    and public_activation_rows=0
  ),
  'verdict',case when (
    priority_cities_covered>=7
    and structured_percent>=80
    and price_coverage_percent>=70
    and surface_coverage_percent>=70
    and ranked_share_percent>=30
    and blocked_rows=0
    and non_shadow_rows=0
    and public_activation_rows=0
  ) then 'READY_FOR_EXPLICIT_ACTIVATION_REVIEW' else 'BLOCKED_BY_DATA_DEPTH' end,
  'shadow_only',true,
  'public_activation',false
) from evaluated;
$$;

revoke all on function public.odm_final_release_gate_report_v1() from public,anon,authenticated;
grant execute on function public.odm_final_release_gate_report_v1() to service_role;
comment on function public.odm_final_release_gate_report_v1() is 'Final bounded Shadow-only release readiness gate. This function never activates public search.';
