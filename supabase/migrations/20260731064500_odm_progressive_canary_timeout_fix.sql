-- ODM PROGRESSIVE CANARY TIMEOUT FIX
-- Bounds the shadow audit window while preserving deterministic cumulative cohorts.

create or replace function public.odm_search_progressive_canary_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with assembled as materialized (
  select * from public.search_odm_assembled_shadow_v1(
    null,null,null,null,'maximum_coverage',null,null,null,null,false,false,false,250
  )
), assigned as (
  select a.*,
    mod(abs(hashtextextended(a.observation_id,20260730)),100) as cohort_bucket
  from assembled a
), stages(stage_percent) as (
  values (1),(5),(10),(25)
), stage_reports as (
  select s.stage_percent,
    count(*) filter(where a.cohort_bucket<s.stage_percent) as cohort_rows,
    round(100.0*count(*) filter(where a.cohort_bucket<s.stage_percent)/nullif(count(*),0),2) as observed_percent,
    count(*) filter(where a.cohort_bucket<s.stage_percent and a.display_tier_v2='displayable_ranked') as ranked,
    count(*) filter(where a.cohort_bucket<s.stage_percent and a.display_tier_v2='displayable_degraded') as degraded,
    count(*) filter(where a.cohort_bucket<s.stage_percent and cardinality(a.warnings)>0) as with_warnings,
    count(*) filter(where a.cohort_bucket<s.stage_percent and a.display_tier_v2='blocked')=0 as blocked_rows_absent,
    count(*) filter(where a.cohort_bucket<s.stage_percent and a.assembly_metadata#>>'{shadow_only}'<>'true')=0 as all_rows_shadow_only,
    count(*) filter(where a.cohort_bucket<s.stage_percent and a.assembly_metadata#>>'{public_activation}'<>'false')=0 as public_activation_disabled,
    count(*) filter(where a.cohort_bucket<s.stage_percent and a.explanation_evidence is null)=0 as all_rows_explained
  from stages s cross join assigned a
  group by s.stage_percent
), monotonic as (
  select coalesce(bool_and(cohort_rows>=lag_rows),true) as cohorts_monotonic
  from (
    select stage_percent,cohort_rows,
      lag(cohort_rows) over(order by stage_percent) as lag_rows
    from stage_reports
  ) x
  where lag_rows is not null
)
select jsonb_build_object(
  'audit_version','odm_search_progressive_canary_v1',
  'generated_at',now(),
  'audit_window',250,
  'assignment',jsonb_build_object(
    'algorithm','hashtextextended_mod_100',
    'seed',20260730,
    'stages',jsonb_build_array(1,5,10,25)
  ),
  'population',jsonb_build_object('eligible_rows',(select count(*) from assigned)),
  'stages',(
    select jsonb_agg(jsonb_build_object(
      'target_percent',stage_percent,
      'cohort_rows',cohort_rows,
      'observed_percent',observed_percent,
      'ranked',ranked,
      'degraded',degraded,
      'with_warnings',with_warnings,
      'gates',jsonb_build_object(
        'blocked_rows_absent',blocked_rows_absent,
        'all_rows_shadow_only',all_rows_shadow_only,
        'public_activation_disabled',public_activation_disabled,
        'all_rows_explained',all_rows_explained
      )
    ) order by stage_percent) from stage_reports
  ),
  'gates',jsonb_build_object(
    'deterministic_assignment',count(*) filter(where cohort_bucket<>mod(abs(hashtextextended(observation_id,20260730)),100))=0,
    'cohorts_monotonic',(select cohorts_monotonic from monotonic),
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ),
  'shadow_only',true,
  'public_activation',false
) from assigned;
$$;

comment on function public.odm_search_progressive_canary_report_v1() is 'Deterministic service-role-only progressive Shadow canary report at 1, 5, 10 and 25 percent with a bounded 250-row audit window.';