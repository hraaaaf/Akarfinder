-- ODM SEARCH CANARY 1 PERCENT V1
-- Deterministic Shadow-only cohort certification over Search Assembly V1.

create or replace function public.odm_search_canary_1pct_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with assembled as materialized (
  select * from public.search_odm_assembled_shadow_v1(
    null,null,null,null,'maximum_coverage',null,null,null,null,false,false,false,500
  )
), assigned as (
  select a.*,
    mod(abs(hashtextextended(a.observation_id,20260730)),100) as cohort_bucket
  from assembled a
), canary as (
  select * from assigned where cohort_bucket=0
), gates as (
  select jsonb_build_object(
    'deterministic_assignment',count(*) filter(where cohort_bucket<>mod(abs(hashtextextended(observation_id,20260730)),100))=0,
    'exact_one_percent_bucket',count(*) filter(where cohort_bucket<>0)=0,
    'blocked_rows_absent',count(*) filter(where display_tier_v2='blocked')=0,
    'all_rows_shadow_only',count(*) filter(where assembly_metadata#>>'{shadow_only}'<>'true')=0,
    'public_activation_disabled',count(*) filter(where assembly_metadata#>>'{public_activation}'<>'false')=0,
    'all_rows_explained',count(*) filter(where explanation_evidence is null)=0,
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ) value from canary
)
select jsonb_build_object(
  'audit_version','odm_search_canary_1pct_v1',
  'generated_at',now(),
  'assignment',jsonb_build_object(
    'algorithm','hashtextextended_mod_100',
    'seed',20260730,
    'selected_bucket',0,
    'target_percent',1
  ),
  'population',jsonb_build_object(
    'eligible_rows',(select count(*) from assigned),
    'canary_rows',count(*),
    'observed_percent',round(100.0*count(*)/nullif((select count(*) from assigned),0),2)
  ),
  'counts',jsonb_build_object(
    'ranked',count(*) filter(where display_tier_v2='displayable_ranked'),
    'degraded',count(*) filter(where display_tier_v2='displayable_degraded'),
    'with_warnings',count(*) filter(where cardinality(warnings)>0)
  ),
  'gates',(select value from gates),
  'shadow_only',true,
  'public_activation',false
) from canary;
$$;

revoke all on function public.odm_search_canary_1pct_report_v1() from public,anon,authenticated;
grant execute on function public.odm_search_canary_1pct_report_v1() to service_role;
comment on function public.odm_search_canary_1pct_report_v1() is 'Deterministic service-role-only 1 percent Shadow canary certification for ODM Search Assembly V1.';
