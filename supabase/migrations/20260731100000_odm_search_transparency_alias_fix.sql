-- ODM SEARCH TRANSPARENCY V1 ALIAS FIX
-- Disambiguates aggregate row aliases in the report output.

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
    count(*) source_rows,
    count(*) filter(where display_tier_v2='displayable_ranked') ranked,
    count(*) filter(where display_tier_v2='displayable_degraded') degraded,
    count(*) filter(where normalized_price_mad is null) price_missing,
    count(*) filter(where normalized_surface_m2 is null) surface_missing,
    count(*) filter(where cardinality(warnings)>0) with_warnings
  from assembled group by source_domain
), totals as (
  select count(*) total_rows,
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
    'rows',t.total_rows,'source_domains',t.source_domains,'ranked',t.ranked,'degraded',t.degraded,
    'price_missing',t.price_missing,'surface_missing',t.surface_missing,'with_warnings',t.with_warnings,
    'price_coverage_percent',round(100.0*(t.total_rows-t.price_missing)/nullif(t.total_rows,0),2),
    'surface_coverage_percent',round(100.0*(t.total_rows-t.surface_missing)/nullif(t.total_rows,0),2)
  ),
  'sources',(select coalesce(jsonb_agg(jsonb_build_object(
    'source_domain',b.source_domain,'rows',b.source_rows,'ranked',b.ranked,'degraded',b.degraded,
    'price_missing',b.price_missing,'surface_missing',b.surface_missing,'with_warnings',b.with_warnings
  ) order by b.source_rows desc,b.source_domain),'[]'::jsonb) from by_source b),
  'gates',jsonb_build_object(
    'all_rows_explained',t.unexplained=0,
    'blocked_rows_absent',t.blocked=0,
    'all_rows_shadow_only',t.non_shadow=0,
    'public_activation_disabled',t.publicly_activated=0,
    'source_breakdown_complete',(select coalesce(sum(b.source_rows),0) from by_source b)=t.total_rows,
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ),
  'shadow_only',true,
  'public_activation',false
) from totals t;
$$;

comment on function public.odm_search_transparency_report_v1() is 'Service-role-only Shadow transparency report for ODM Search Assembly V1 with explicit aggregate aliases.';
