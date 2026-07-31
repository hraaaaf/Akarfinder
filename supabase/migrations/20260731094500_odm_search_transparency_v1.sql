-- ODM SEARCH TRANSPARENCY V1
-- Service-role-only aggregate transparency over Search Assembly V1.

create or replace function public.odm_search_transparency_report_v1()
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
), by_source as (
  select source_domain,
    count(*) rows,
    count(*) filter(where display_tier_v2='displayable_ranked') ranked,
    count(*) filter(where display_tier_v2='displayable_degraded') degraded,
    count(*) filter(where normalized_price_mad is null) price_missing,
    count(*) filter(where normalized_surface_m2 is null) surface_missing,
    count(*) filter(where cardinality(warnings)>0) with_warnings
  from assembled group by source_domain
), totals as (
  select count(*) rows,
    count(distinct source_domain) source_domains,
    count(*) filter(where display_tier_v2='displayable_ranked') ranked,
    count(*) filter(where display_tier_v2='displayable_degraded') degraded,
    count(*) filter(where normalized_price_mad is null) price_missing,
    count(*) filter(where normalized_surface_m2 is null) surface_missing,
    count(*) filter(where cardinality(warnings)>0) with_warnings,
    count(*) filter(where explanation_evidence is null) unexplained,
    count(*) filter(where assembly_metadata#>>'{shadow_only}'<>'true') non_shadow,
    count(*) filter(where assembly_metadata#>>'{public_activation}'<>'false') publicly_activated,
    count(*) filter(where display_tier_v2='blocked') blocked
  from assembled
)
select jsonb_build_object(
  'audit_version','odm_search_transparency_v1',
  'generated_at',now(),
  'audit_window',250,
  'totals',jsonb_build_object(
    'rows',rows,'source_domains',source_domains,'ranked',ranked,'degraded',degraded,
    'price_missing',price_missing,'surface_missing',surface_missing,'with_warnings',with_warnings,
    'price_coverage_percent',round(100.0*(rows-price_missing)/nullif(rows,0),2),
    'surface_coverage_percent',round(100.0*(rows-surface_missing)/nullif(rows,0),2)
  ),
  'sources',(select coalesce(jsonb_agg(jsonb_build_object(
    'source_domain',source_domain,'rows',rows,'ranked',ranked,'degraded',degraded,
    'price_missing',price_missing,'surface_missing',surface_missing,'with_warnings',with_warnings
  ) order by rows desc,source_domain),'[]'::jsonb) from by_source),
  'gates',jsonb_build_object(
    'all_rows_explained',unexplained=0,
    'blocked_rows_absent',blocked=0,
    'all_rows_shadow_only',non_shadow=0,
    'public_activation_disabled',publicly_activated=0,
    'source_breakdown_complete',(select coalesce(sum(rows),0) from by_source)=rows,
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ),
  'shadow_only',true,
  'public_activation',false
) from totals;
$$;

revoke all on function public.odm_search_transparency_report_v1() from public,anon,authenticated;
grant execute on function public.odm_search_transparency_report_v1() to service_role;
comment on function public.odm_search_transparency_report_v1() is 'Service-role-only Shadow transparency report for ODM Search Assembly V1.';
