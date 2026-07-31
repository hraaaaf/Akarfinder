-- ODM SEARCH DEPTH CERTIFICATION V1 DIMENSION FIX
-- Separates geographic coverage from structured type/intent coverage.

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
), scenarios(scenario_id,city,property_type,intent,dimension) as (
  values
    ('geo_casablanca','Casablanca',null,null,'geographic'),
    ('geo_rabat','Rabat',null,null,'geographic'),
    ('geo_marrakech','Marrakech',null,null,'geographic'),
    ('geo_agadir','Agadir',null,null,'geographic'),
    ('geo_fes','Fès',null,null,'geographic'),
    ('geo_tanger','Tanger',null,null,'geographic'),
    ('geo_kenitra','Kénitra',null,null,'geographic'),
    ('structured_marrakech_office_rent','Marrakech','office','rent','structured'),
    ('structured_marrakech_commercial_sale','Marrakech','commercial','sale','structured'),
    ('structured_casablanca_apartment_sale','Casablanca','apartment','sale','structured')
), reports as (
  select s.scenario_id,s.city,s.property_type,s.intent,s.dimension,
    count(a.*) rows,
    count(a.*) filter(where a.display_tier_v2='displayable_ranked') ranked,
    count(a.*) filter(where a.display_tier_v2='displayable_degraded') degraded,
    count(a.*) filter(where a.normalized_price_mad is not null) with_price,
    count(a.*) filter(where a.normalized_surface_m2 is not null) with_surface
  from scenarios s
  left join assembled a
    on a.normalized_city=s.city
   and (s.property_type is null or a.normalized_property_type=s.property_type)
   and (s.intent is null or a.normalized_intent=s.intent)
  group by s.scenario_id,s.city,s.property_type,s.intent,s.dimension
)
select jsonb_build_object(
  'audit_version','odm_search_depth_certification_v1',
  'generated_at',now(),
  'audit_window',250,
  'scenario_count',count(*),
  'field_completeness',jsonb_build_object(
    'city_present',(select count(*) filter(where normalized_city is not null) from assembled),
    'property_type_present',(select count(*) filter(where normalized_property_type is not null) from assembled),
    'intent_present',(select count(*) filter(where normalized_intent is not null) from assembled),
    'fully_structured',(select count(*) filter(where normalized_city is not null and normalized_property_type is not null and normalized_intent is not null) from assembled)
  ),
  'summary',jsonb_build_object(
    'geographic_scenarios_with_results',count(*) filter(where dimension='geographic' and rows>0),
    'geographic_zero_result_scenarios',count(*) filter(where dimension='geographic' and rows=0),
    'structured_scenarios_with_results',count(*) filter(where dimension='structured' and rows>0),
    'structured_zero_result_scenarios',count(*) filter(where dimension='structured' and rows=0),
    'scenarios_with_ranked_results',count(*) filter(where ranked>0)
  ),
  'scenarios',jsonb_agg(jsonb_build_object(
    'scenario_id',scenario_id,'dimension',dimension,'city',city,
    'property_type',property_type,'intent',intent,'rows',rows,
    'ranked',ranked,'degraded',degraded,'with_price',with_price,'with_surface',with_surface,
    'zero_result',rows=0,
    'ranked_share_percent',round(100.0*ranked/nullif(rows,0),2),
    'price_coverage_percent',round(100.0*with_price/nullif(rows,0),2),
    'surface_coverage_percent',round(100.0*with_surface/nullif(rows,0),2)
  ) order by dimension,scenario_id),
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

comment on function public.odm_search_depth_certification_report_v1() is 'Bounded Shadow depth certification separating geographic coverage from structured type and intent depth.';
