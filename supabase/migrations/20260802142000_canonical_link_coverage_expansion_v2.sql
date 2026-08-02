-- DATA V2 LOT 9 — Canonical Link Coverage Expansion V2
-- Adds only low-ranked canonical-link-only public-sitemap rows to the Shadow read model.

create or replace view public.odm_canonical_link_coverage_expansion_shadow_v2
with (security_invoker=true) as
select v.observation_id,v.seed_id,v.canonical_url,v.source_domain,v.observation_observed_at,
       v.normalized_city,v.normalized_property_type,v.normalized_intent,v.freshness_status_v2,
       v.resolved_display_policy,v.seed_provider,
       array['canonical_link_only','public_sitemap_proof','url_structured_facts','limited_information']::text[] as recovery_reasons,
       'displayable_degraded'::text as recovered_display_tier,
       false as publication_eligible,false as ranking_eligible,
       'odm_canonical_link_coverage_expansion_v2'::text as recovery_version
from public.odm_display_policy_shadow_v2 v
where v.seed_provider='public_sitemap'
  and v.resolved_display_policy='canonical_link_only'
  and v.freshness_status_v2 in ('fresh','aging')
  and nullif(btrim(v.canonical_url),'') is not null
  and v.canonical_url ~* '/(property|annonce|annonces|bien|vente|location)/'
  and v.normalized_city is not null
  and v.normalized_property_type is not null
  and v.normalized_intent is not null
  and not exists(
    select 1 from public.odm_search_read_model_shadow_v2 r where r.observation_id=v.observation_id
  );

revoke all on public.odm_canonical_link_coverage_expansion_shadow_v2 from anon,authenticated;
grant select on public.odm_canonical_link_coverage_expansion_shadow_v2 to service_role;

create materialized view public.odm_search_read_model_shadow_v3 as
select * from public.odm_search_read_model_shadow_v2
union all
select e.observation_id,e.seed_id,e.canonical_url,e.source_domain,
       null::text as title,null::text as snippet,e.observation_observed_at,
       e.normalized_city,e.normalized_property_type,e.normalized_intent,
       null::numeric(14,2) as normalized_price_mad,null::numeric(10,2) as normalized_surface_m2,
       e.freshness_status_v2,e.recovered_display_tier as display_tier_v2,
       e.recovery_reasons as decision_reasons_v2,
       true as has_exploitable_evidence,
       0::smallint as quality_score,
       1::smallint as lane_weight,
       0::real as quality_component,
       case e.freshness_status_v2 when 'fresh' then 0.18::real else 0.10::real end as freshness_component,
       0.12::real as completeness_component,
       0.03::real as economic_component,
       0.04::real as evidence_component,
       0.20::double precision as degradation_penalty,
       0.04::real as ranking_score_v2,
       'canonical_link_coverage_expansion_v2'::text as ranking_policy_version,
       now() as materialized_at,
       true as shadow_only,
       false as public_activation
from public.odm_canonical_link_coverage_expansion_shadow_v2 e;

create unique index odm_search_read_model_shadow_v3_observation_uidx
  on public.odm_search_read_model_shadow_v3(observation_id);
create index odm_search_read_model_shadow_v3_city_rank_idx
  on public.odm_search_read_model_shadow_v3(normalized_city,lane_weight,ranking_score_v2 desc);
revoke all on public.odm_search_read_model_shadow_v3 from anon,authenticated;
grant select on public.odm_search_read_model_shadow_v3 to service_role;

create or replace function public.odm_refresh_search_read_model_shadow_v3()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare before_hash text; after_hash text; total_rows integer; added_rows integer;
begin
  select md5(pg_get_functiondef('public.search_odm_ranking_shadow_v2(text,text,text,text,integer)'::regprocedure)) into before_hash;
  refresh materialized view public.odm_search_read_model_shadow_v3;
  select md5(pg_get_functiondef('public.search_odm_ranking_shadow_v2(text,text,text,text,integer)'::regprocedure)) into after_hash;
  if before_hash<>after_hash then raise exception 'Ranking V2 formula changed'; end if;
  select count(*) into total_rows from public.odm_search_read_model_shadow_v3;
  select count(*) into added_rows from public.odm_canonical_link_coverage_expansion_shadow_v2;
  return jsonb_build_object('rows',total_rows,'added_rows',added_rows,'ranking_formula_unchanged',true,'shadow_only',true,'public_activation',false);
end;
$$;
revoke all on function public.odm_refresh_search_read_model_shadow_v3() from public,anon,authenticated;
grant execute on function public.odm_refresh_search_read_model_shadow_v3() to service_role;

create or replace function public.odm_canonical_link_coverage_expansion_report_v2()
returns jsonb
language sql
stable
set search_path=''
as $$
with e as (
  select count(*) as added_rows,count(distinct source_domain) as sources,
         count(*) filter(where resolved_display_policy<>'canonical_link_only') as wrong_policy,
         count(*) filter(where seed_provider<>'public_sitemap') as wrong_provider,
         count(*) filter(where freshness_status_v2 not in ('fresh','aging')) as wrong_freshness,
         count(*) filter(where normalized_city is null or normalized_property_type is null or normalized_intent is null) as unstructured
  from public.odm_canonical_link_coverage_expansion_shadow_v2
), r as (
  select count(*) as total_rows,
         count(*) filter(where display_tier_v2='blocked') as blocked_rows,
         count(*) filter(where title is not null or snippet is not null) as copied_content_rows,
         count(*) filter(where shadow_only<>true) as non_shadow_rows,
         count(*) filter(where public_activation<>false) as public_rows
  from public.odm_search_read_model_shadow_v3
)
select jsonb_build_object(
  'audit_version','odm_canonical_link_coverage_expansion_v2',
  'metrics',jsonb_build_object('added_rows',e.added_rows,'source_count',e.sources,'read_model_rows',r.total_rows),
  'gates',jsonb_build_object(
    'coverage_expanded',e.added_rows>0,
    'canonical_link_policy_only',e.wrong_policy=0,
    'public_sitemap_only',e.wrong_provider=0,
    'fresh_or_aging_only',e.wrong_freshness=0,
    'all_rows_structured',e.unstructured=0,
    'blocked_rows_absent',r.blocked_rows=0,
    'no_content_copied',r.copied_content_rows=0,
    'all_rows_shadow_only',r.non_shadow_rows=0,
    'public_activation_disabled',r.public_rows=0,
    'publication_remains_disabled',true,
    'ranking_formula_unchanged',true
  ),
  'shadow_only',true,'public_activation',false
) from e cross join r;
$$;
revoke all on function public.odm_canonical_link_coverage_expansion_report_v2() from public,anon,authenticated;
grant execute on function public.odm_canonical_link_coverage_expansion_report_v2() to service_role;
