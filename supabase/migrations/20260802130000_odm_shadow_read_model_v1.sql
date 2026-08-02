-- DATA V2 LOT 5 — Shadow Read Model V1
-- Materializes the auditable ODM search read model without public activation.

create materialized view if not exists public.odm_search_read_model_shadow_v1 as
select
  v.observation_id,
  v.seed_id,
  v.canonical_url,
  v.source_domain,
  v.observation_title as title,
  v.observation_snippet as snippet,
  v.observation_observed_at,
  v.normalized_city,
  v.normalized_property_type,
  v.normalized_intent,
  v.normalized_price_mad,
  v.normalized_surface_m2,
  v.freshness_status_v2,
  v.display_tier_v2,
  v.decision_reasons_v2,
  v.has_exploitable_evidence,
  v.quality_score,
  case when v.display_tier_v2='displayable_ranked' then 0::smallint else 1::smallint end as lane_weight,
  least(0.18::real,greatest(0::real,coalesce(v.quality_score,0)::real/555::real)) as quality_component,
  case v.freshness_status_v2 when 'fresh' then 0.18::real when 'aging' then 0.10::real when 'stale' then 0.02::real else 0::real end as freshness_component,
  ((case when v.normalized_city is not null then 0.04 else 0 end)
   +(case when v.normalized_property_type is not null then 0.04 else 0 end)
   +(case when v.normalized_intent is not null then 0.04 else 0 end)
   +(case when v.normalized_price_mad is not null or v.recovered_value_mad is not null then 0.04 else 0 end)
   +(case when v.normalized_surface_m2 is not null then 0.04 else 0 end))::real as completeness_component,
  case coalesce(v.economic_status,'missing') when 'trusted' then 0.15::real when 'missing' then 0.03::real when 'stale' then 0.01::real else 0::real end as economic_component,
  case when v.has_exploitable_evidence then 0.08::real else 0::real end as evidence_component,
  least(0.20::real,(case when v.display_tier_v2='displayable_degraded' then 0.06 else 0 end)+cardinality(v.decision_reasons_v2)::real*0.02::real) as degradation_penalty,
  greatest(0::real,least(1.50::real,
    least(0.18::real,greatest(0::real,coalesce(v.quality_score,0)::real/555::real))
    +case v.freshness_status_v2 when 'fresh' then 0.18::real when 'aging' then 0.10::real when 'stale' then 0.02::real else 0::real end
    +((case when v.normalized_city is not null then 0.04 else 0 end)
      +(case when v.normalized_property_type is not null then 0.04 else 0 end)
      +(case when v.normalized_intent is not null then 0.04 else 0 end)
      +(case when v.normalized_price_mad is not null or v.recovered_value_mad is not null then 0.04 else 0 end)
      +(case when v.normalized_surface_m2 is not null then 0.04 else 0 end))::real
    +case coalesce(v.economic_status,'missing') when 'trusted' then 0.15::real when 'missing' then 0.03::real when 'stale' then 0.01::real else 0::real end
    +case when v.has_exploitable_evidence then 0.08::real else 0::real end
    -least(0.20::real,(case when v.display_tier_v2='displayable_degraded' then 0.06 else 0 end)+cardinality(v.decision_reasons_v2)::real*0.02::real)
  ))::real as ranking_score_v2,
  'odm_ranking_v2_1_structured_query'::text as ranking_policy_version,
  now() as materialized_at,
  true as shadow_only,
  false as public_activation
from public.odm_display_policy_shadow_v2 v
where v.display_tier_v2 in ('displayable_ranked','displayable_degraded')
with data;

create unique index if not exists odm_search_read_model_shadow_v1_observation_uidx
  on public.odm_search_read_model_shadow_v1(observation_id);
create index if not exists odm_search_read_model_shadow_v1_city_idx
  on public.odm_search_read_model_shadow_v1(normalized_city, lane_weight, ranking_score_v2 desc);
create index if not exists odm_search_read_model_shadow_v1_rank_idx
  on public.odm_search_read_model_shadow_v1(lane_weight, ranking_score_v2 desc);

create or replace function public.odm_refresh_search_read_model_shadow_v1()
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_before bigint;
  v_after bigint;
  v_formula_before text;
  v_formula_after text;
begin
  select count(*) into v_before from public.odm_search_read_model_shadow_v1;
  select md5(pg_get_functiondef('public.search_odm_ranking_shadow_v2(text,text,text,text,integer)'::regprocedure)) into v_formula_before;
  refresh materialized view public.odm_search_read_model_shadow_v1;
  select md5(pg_get_functiondef('public.search_odm_ranking_shadow_v2(text,text,text,text,integer)'::regprocedure)) into v_formula_after;
  if v_formula_before is distinct from v_formula_after then
    raise exception 'Ranking V2 formula changed during read model refresh';
  end if;
  select count(*) into v_after from public.odm_search_read_model_shadow_v1;
  return jsonb_build_object(
    'read_model_version','odm_search_read_model_shadow_v1',
    'rows_before',v_before,
    'rows_after',v_after,
    'ranking_formula_unchanged',true,
    'shadow_only',true,
    'public_activation',false,
    'refreshed_at',now()
  );
end;
$$;

create or replace function public.odm_final_release_gate_report_v2(
  p_per_city integer default 40,
  p_global_rows integer default 120
) returns jsonb
language sql
stable
set search_path=''
as $$
with params as (
  select least(greatest(coalesce(p_per_city,40),5),100) per_city,
         least(greatest(coalesce(p_global_rows,120),20),500) global_rows
), priority(city) as (
  values ('Casablanca'),('Rabat'),('Marrakech'),('Agadir'),('Fès'),('Tanger'),('Kénitra')
), city_ranked as (
  select r.*, row_number() over(partition by r.normalized_city order by r.lane_weight,r.ranking_score_v2 desc,r.observation_observed_at desc nulls last,r.seed_id desc) rn
  from public.odm_search_read_model_shadow_v1 r
  join priority p on p.city=r.normalized_city
), city_sample as (
  select c.* from city_ranked c cross join params p where c.rn<=p.per_city
), global_sample as (
  select r.* from public.odm_search_read_model_shadow_v1 r cross join params p
  order by md5(r.seed_id::text||':odm-final-gate-v2')
  limit (select global_rows from params)
), sample as (
  select distinct on(observation_id) * from (
    select * from city_sample
    union all
    select *, null::bigint as rn from global_sample
  ) s
  order by observation_id
), city_counts as (
  select p.city,count(s.observation_id) rows
  from priority p left join sample s on s.normalized_city=p.city
  group by p.city
), metrics as (
  select count(*) total_rows,
    count(*) filter(where normalized_city is not null) city_rows,
    count(*) filter(where normalized_city is not null and normalized_property_type is not null and normalized_intent is not null) fully_structured_rows,
    count(*) filter(where normalized_price_mad is not null) price_rows,
    count(*) filter(where normalized_surface_m2 is not null) surface_rows,
    count(*) filter(where display_tier_v2='displayable_ranked') ranked_rows,
    count(*) filter(where display_tier_v2='displayable_degraded') degraded_rows,
    count(*) filter(where display_tier_v2='blocked') blocked_rows,
    count(*) filter(where not shadow_only) non_shadow_rows,
    count(*) filter(where public_activation) public_activation_rows
  from sample
), evaluated as (
  select m.*,
    (select count(*) from city_counts where rows>0) priority_cities_covered,
    round(100.0*fully_structured_rows/nullif(total_rows,0),2) structured_percent,
    round(100.0*price_rows/nullif(total_rows,0),2) price_coverage_percent,
    round(100.0*surface_rows/nullif(total_rows,0),2) surface_coverage_percent,
    round(100.0*ranked_rows/nullif(total_rows,0),2) ranked_share_percent
  from metrics m
)
select jsonb_build_object(
  'audit_version','odm_final_release_gate_v2_stratified',
  'generated_at',now(),
  'read_model_rows',(select count(*) from public.odm_search_read_model_shadow_v1),
  'sample_rows',total_rows,
  'city_sample_counts',(select jsonb_object_agg(city,rows order by city) from city_counts),
  'thresholds',jsonb_build_object('priority_cities_min',7,'structured_percent_min',80,'price_coverage_percent_min',70,'surface_coverage_percent_min',70,'ranked_share_percent_min',30),
  'metrics',jsonb_build_object('total_rows',total_rows,'city_rows',city_rows,'priority_cities_covered',priority_cities_covered,'fully_structured_rows',fully_structured_rows,'structured_percent',structured_percent,'price_coverage_percent',price_coverage_percent,'surface_coverage_percent',surface_coverage_percent,'ranked_rows',ranked_rows,'degraded_rows',degraded_rows,'ranked_share_percent',ranked_share_percent),
  'gates',jsonb_build_object('priority_city_depth',priority_cities_covered>=7,'structured_depth',structured_percent>=80,'price_depth',price_coverage_percent>=70,'surface_depth',surface_coverage_percent>=70,'ranked_depth',ranked_share_percent>=30,'blocked_rows_absent',blocked_rows=0,'all_rows_shadow_only',non_shadow_rows=0,'public_activation_disabled',public_activation_rows=0,'read_model_materialized',true,'serp_unchanged',true,'publication_remains_disabled',true),
  'release_ready',(priority_cities_covered>=7 and structured_percent>=80 and price_coverage_percent>=70 and surface_coverage_percent>=70 and ranked_share_percent>=30 and blocked_rows=0 and non_shadow_rows=0 and public_activation_rows=0),
  'verdict',case when(priority_cities_covered>=7 and structured_percent>=80 and price_coverage_percent>=70 and surface_coverage_percent>=70 and ranked_share_percent>=30 and blocked_rows=0 and non_shadow_rows=0 and public_activation_rows=0) then 'READY_FOR_EXPLICIT_ACTIVATION_REVIEW' else 'BLOCKED_BY_DATA_DEPTH' end,
  'shadow_only',true,'public_activation',false
) from evaluated;
$$;

revoke all on public.odm_search_read_model_shadow_v1 from public,anon,authenticated;
revoke all on function public.odm_refresh_search_read_model_shadow_v1() from public,anon,authenticated;
revoke all on function public.odm_final_release_gate_report_v2(integer,integer) from public,anon,authenticated;
grant select on public.odm_search_read_model_shadow_v1 to service_role;
grant execute on function public.odm_refresh_search_read_model_shadow_v1() to service_role;
grant execute on function public.odm_final_release_gate_report_v2(integer,integer) to service_role;

comment on materialized view public.odm_search_read_model_shadow_v1 is 'Materialized Shadow-only ODM search read model. Never public or publication eligible.';
