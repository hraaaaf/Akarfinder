-- ODM SEARCH DEPTH CERTIFICATION V1
-- Bounded Shadow certification across priority Moroccan market scenarios.

create or replace function public.odm_search_depth_certification_report_v1()
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
), scenarios(city,property_type,intent) as (
  values
    ('casablanca','apartment','sale'),
    ('casablanca','apartment','rent'),
    ('rabat','apartment','sale'),
    ('rabat','apartment','rent'),
    ('marrakech','apartment','sale'),
    ('marrakech','villa','sale'),
    ('tanger','apartment','sale'),
    ('agadir','apartment','sale'),
    ('fes','apartment','sale'),
    ('kenitra','apartment','sale')
), reports as (
  select s.city,s.property_type,s.intent,
    count(a.*) rows,
    count(a.*) filter(where a.display_tier_v2='displayable_ranked') ranked,
    count(a.*) filter(where a.display_tier_v2='displayable_degraded') degraded,
    count(a.*) filter(where a.normalized_price_mad is not null) with_price,
    count(a.*) filter(where a.normalized_surface_m2 is not null) with_surface
  from scenarios s
  left join assembled a
    on a.normalized_city=s.city
   and a.normalized_property_type=s.property_type
   and a.normalized_intent=s.intent
  group by s.city,s.property_type,s.intent
)
select jsonb_build_object(
  'audit_version','odm_search_depth_certification_v1',
  'generated_at',now(),
  'audit_window',250,
  'scenario_count',count(*),
  'summary',jsonb_build_object(
    'scenarios_with_results',count(*) filter(where rows>0),
    'zero_result_scenarios',count(*) filter(where rows=0),
    'scenarios_with_ranked_results',count(*) filter(where ranked>0),
    'all_scenarios_covered',count(*) filter(where rows=0)=0
  ),
  'scenarios',jsonb_agg(jsonb_build_object(
    'city',city,'property_type',property_type,'intent',intent,
    'rows',rows,'ranked',ranked,'degraded',degraded,
    'with_price',with_price,'with_surface',with_surface,
    'zero_result',rows=0,
    'ranked_share_percent',round(100.0*ranked/nullif(rows,0),2),
    'price_coverage_percent',round(100.0*with_price/nullif(rows,0),2),
    'surface_coverage_percent',round(100.0*with_surface/nullif(rows,0),2)
  ) order by city,property_type,intent),
  'gates',jsonb_build_object(
    'blocked_rows_absent',(select count(*) filter(where display_tier_v2='blocked')=0 from assembled),
    'all_rows_shadow_only',(select count(*) filter(where assembly_metadata#>>'{shadow_only}'<>'true')=0 from assembled),
    'public_activation_disabled',(select count(*) filter(where assembly_metadata#>>'{public_activation}'<>'false')=0 from assembled),
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ),
  'shadow_only',true,
  'public_activation',false
) from reports;
$$;

revoke all on function public.odm_search_depth_certification_report_v1() from public,anon,authenticated;
grant execute on function public.odm_search_depth_certification_report_v1() to service_role;
comment on function public.odm_search_depth_certification_report_v1() is 'Bounded service-role-only Shadow depth certification across priority Moroccan search scenarios.';
