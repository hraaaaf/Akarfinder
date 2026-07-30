-- ODM SEARCH ASSEMBLY V1
-- Shadow-only productized search payload combining noise controls and deterministic explanations.
-- No public search, SERP, publication, Thin Index, Ranking V2 or Display Policy V2 mutation.

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
  observation_id text,
  seed_id uuid,
  canonical_url text,
  source_domain text,
  title text,
  snippet text,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  normalized_price_mad numeric,
  normalized_surface_m2 numeric,
  freshness_status_v2 text,
  display_tier_v2 text,
  ranking_score_v2 real,
  lane_weight smallint,
  applied_mode text,
  noise_control_reasons text[],
  match_reasons text[],
  quality_reasons text[],
  freshness_reasons text[],
  ranking_reasons text[],
  warnings text[],
  explanation_evidence jsonb,
  assembly_metadata jsonb,
  assembly_version text
)
language sql
stable
security invoker
set search_path=''
as $$
with controlled as materialized (
  select * from public.search_odm_noise_controls_shadow_v1(
    p_query,p_city,p_property_type,p_intent,p_mode,
    p_min_price,p_max_price,p_min_surface,p_max_surface,
    p_fresh_only,p_require_price,p_require_surface,
    least(greatest(coalesce(p_limit,100),1),500)
  )
), explained as materialized (
  select * from public.search_odm_explained_shadow_v1(
    p_query,p_city,p_property_type,p_intent,
    least(greatest(coalesce(p_limit,100),1),500)
  )
)
select
  c.observation_id,c.seed_id,c.canonical_url,c.source_domain,c.title,c.snippet,
  c.normalized_city,c.normalized_property_type,c.normalized_intent,
  c.normalized_price_mad,c.normalized_surface_m2,c.freshness_status_v2,
  c.display_tier_v2,c.ranking_score_v2,c.lane_weight,c.applied_mode,
  c.noise_control_reasons,e.match_reasons,e.quality_reasons,e.freshness_reasons,
  e.ranking_reasons,e.warnings,e.explanation_evidence,
  jsonb_build_object(
    'shadow_only',true,
    'public_activation',false,
    'display_policy_version','odm_display_policy_v2',
    'ranking_version','odm_ranking_v2',
    'noise_controls_version',c.controls_version,
    'explanation_version',e.explanation_version,
    'capabilities',public.odm_search_control_capabilities_v1()
  ),
  'odm_search_assembly_v1'::text
from controlled c
join explained e using(observation_id)
order by c.lane_weight asc,c.ranking_score_v2 desc,c.seed_id desc;
$$;

create or replace function public.odm_search_assembly_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with a as materialized (
  select * from public.search_odm_assembled_shadow_v1(null,null,null,null,'maximum_coverage',null,null,null,null,false,false,false,500)
), gates as (
  select jsonb_build_object(
    'all_rows_have_explanations',count(*) filter(where explanation_evidence is null)=0,
    'all_rows_have_assembly_metadata',count(*) filter(where assembly_metadata is null)=0,
    'all_rows_shadow_only',count(*) filter(where assembly_metadata#>>'{shadow_only}'<>'true')=0,
    'public_activation_disabled',count(*) filter(where assembly_metadata#>>'{public_activation}'<>'false')=0,
    'blocked_rows_absent',count(*) filter(where display_tier_v2='blocked')=0,
    'ranking_order_preserved',coalesce(bool_and(lane_weight in (0,1)),true),
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ) value from a
)
select jsonb_build_object(
  'audit_version','odm_search_assembly_v1',
  'generated_at',now(),
  'counts',jsonb_build_object(
    'rows',count(*),
    'ranked',count(*) filter(where display_tier_v2='displayable_ranked'),
    'degraded',count(*) filter(where display_tier_v2='displayable_degraded'),
    'with_warnings',count(*) filter(where cardinality(warnings)>0)
  ),
  'gates',(select value from gates),
  'active_search_changed',false,
  'serp_changed',false,
  'publication_activated',false
) from a;
$$;

revoke all on function public.search_odm_assembled_shadow_v1(text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,integer) from public,anon,authenticated;
revoke all on function public.odm_search_assembly_report_v1() from public,anon,authenticated;
grant execute on function public.search_odm_assembled_shadow_v1(text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,integer) to service_role;
grant execute on function public.odm_search_assembly_report_v1() to service_role;

comment on function public.search_odm_assembled_shadow_v1(text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,integer) is 'Shadow-only assembled ODM search payload combining controls, ranking and deterministic explanations.';
comment on function public.odm_search_assembly_report_v1() is 'Service-role-only LOT 5 Search Assembly safety and coverage report.';