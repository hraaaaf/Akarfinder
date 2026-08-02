-- DATA V2 LOT 6 — Displayable Coverage Recovery V1
-- Fail-closed recovery for canonical-link-only public-sitemap observations.

create table public.odm_displayable_coverage_recovery_audit_v1 (
  observation_id text primary key,
  seed_id uuid not null,
  canonical_url text not null,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  source_domain text not null,
  recovery_status text not null check (recovery_status in ('recoverable','blocked')),
  recovery_reason text not null,
  recovered_at timestamptz not null default now()
);
alter table public.odm_displayable_coverage_recovery_audit_v1 enable row level security;
revoke all on public.odm_displayable_coverage_recovery_audit_v1 from anon, authenticated;
grant select,insert,update,delete on public.odm_displayable_coverage_recovery_audit_v1 to service_role;

create view public.odm_displayable_coverage_recovery_shadow_v1
with (security_invoker=true) as
with candidates as (
  select v.*,
    case
      when v.resolved_display_policy <> 'canonical_link_only' then 'blocked'
      when v.seed_provider <> 'public_sitemap' then 'blocked'
      when v.freshness_status_v2 not in ('fresh','aging') then 'blocked'
      when nullif(btrim(v.canonical_url),'') is null then 'blocked'
      when v.normalized_city is null or v.normalized_property_type is null or v.normalized_intent is null then 'blocked'
      when v.canonical_url !~* '/property/' then 'blocked'
      else 'recoverable'
    end as coverage_recovery_status,
    case
      when v.resolved_display_policy <> 'canonical_link_only' then 'source_policy_not_canonical_link_only'
      when v.seed_provider <> 'public_sitemap' then 'not_public_sitemap_evidence'
      when v.freshness_status_v2 not in ('fresh','aging') then 'freshness_not_acceptable'
      when nullif(btrim(v.canonical_url),'') is null then 'canonical_url_missing'
      when v.normalized_city is null then 'city_missing'
      when v.normalized_property_type is null then 'property_type_missing'
      when v.normalized_intent is null then 'intent_missing'
      when v.canonical_url !~* '/property/' then 'url_not_property_route'
      else 'canonical_link_public_sitemap_proof'
    end as coverage_recovery_reason
  from public.odm_display_policy_shadow_v2 v
  where v.normalized_city in ('Tanger','Kénitra')
)
select c.observation_id,c.seed_id,c.canonical_url,c.source_domain,c.seed_provider,
  c.normalized_city,c.normalized_property_type,c.normalized_intent,
  c.freshness_status_v2,c.resolved_display_policy,
  c.coverage_recovery_status as recovery_status,
  c.coverage_recovery_reason as recovery_reason,
  case when c.coverage_recovery_status='recoverable' then 'displayable_degraded' else 'blocked' end as recovered_display_tier,
  case when c.coverage_recovery_status='recoverable'
    then array['canonical_link_only','public_sitemap_proof','limited_information']::text[]
    else c.decision_reasons_v2 end as recovered_decision_reasons,
  false as publication_eligible,false as ranking_eligible,
  'odm_displayable_coverage_recovery_v1'::text as recovery_version
from candidates c;
revoke all on public.odm_displayable_coverage_recovery_shadow_v1 from anon,authenticated;
grant select on public.odm_displayable_coverage_recovery_shadow_v1 to service_role;

create function public.odm_refresh_displayable_coverage_recovery_v1()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_recoverable integer; v_blocked integer; v_tanger integer; v_kenitra integer;
begin
 truncate public.odm_displayable_coverage_recovery_audit_v1;
 insert into public.odm_displayable_coverage_recovery_audit_v1(
  observation_id,seed_id,canonical_url,normalized_city,normalized_property_type,
  normalized_intent,source_domain,recovery_status,recovery_reason)
 select observation_id,seed_id,canonical_url,normalized_city,normalized_property_type,
  normalized_intent,source_domain,recovery_status,recovery_reason
 from public.odm_displayable_coverage_recovery_shadow_v1;
 select count(*) filter(where recovery_status='recoverable'),
  count(*) filter(where recovery_status='blocked'),
  count(*) filter(where recovery_status='recoverable' and normalized_city='Tanger'),
  count(*) filter(where recovery_status='recoverable' and normalized_city='Kénitra')
 into v_recoverable,v_blocked,v_tanger,v_kenitra
 from public.odm_displayable_coverage_recovery_audit_v1;
 return jsonb_build_object('recoverable',v_recoverable,'blocked',v_blocked,
  'tanger_recoverable',v_tanger,'kenitra_recoverable',v_kenitra,
  'shadow_only',true,'public_activation',false);
end;$$;
revoke all on function public.odm_refresh_displayable_coverage_recovery_v1() from public,anon,authenticated;
grant execute on function public.odm_refresh_displayable_coverage_recovery_v1() to service_role;

create materialized view public.odm_search_read_model_shadow_v2 as
select * from public.odm_search_read_model_shadow_v1
union all
select
 r.observation_id,r.seed_id,r.canonical_url,r.source_domain,
 null::text as title,null::text as snippet,now() as observation_observed_at,
 r.normalized_city,r.normalized_property_type,r.normalized_intent,
 null::numeric(14,2),null::numeric(10,2),r.freshness_status_v2,
 r.recovered_display_tier,r.recovered_decision_reasons,true,
 0::smallint,1::smallint,0::real,
 case r.freshness_status_v2 when 'fresh' then 0.18::real else 0.10::real end,
 0.12::real,0.03::real,0.08::real,0.12::double precision,0.05::real,
 'odm_ranking_v2_1_structured_query'::text,now(),true,false
from public.odm_displayable_coverage_recovery_shadow_v1 r
where r.recovery_status='recoverable'
 and not exists(select 1 from public.odm_search_read_model_shadow_v1 b where b.observation_id=r.observation_id);
create unique index odm_search_read_model_shadow_v2_observation_uidx on public.odm_search_read_model_shadow_v2(observation_id);
create index odm_search_read_model_shadow_v2_city_rank_idx on public.odm_search_read_model_shadow_v2(normalized_city,lane_weight,ranking_score_v2 desc);
revoke all on public.odm_search_read_model_shadow_v2 from anon,authenticated;
grant select on public.odm_search_read_model_shadow_v2 to service_role;

create function public.odm_refresh_search_read_model_shadow_v2()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_before text; v_after text; v_rows integer;
begin
 select md5(pg_get_functiondef('public.search_odm_ranking_shadow_v2(text,text,text,text,integer)'::regprocedure)) into v_before;
 refresh materialized view public.odm_search_read_model_shadow_v2;
 select md5(pg_get_functiondef('public.search_odm_ranking_shadow_v2(text,text,text,text,integer)'::regprocedure)) into v_after;
 if v_before<>v_after then raise exception 'Ranking V2 formula changed'; end if;
 select count(*) into v_rows from public.odm_search_read_model_shadow_v2;
 return jsonb_build_object('rows',v_rows,'ranking_formula_unchanged',true,'shadow_only',true,'public_activation',false);
end;$$;
revoke all on function public.odm_refresh_search_read_model_shadow_v2() from public,anon,authenticated;
grant execute on function public.odm_refresh_search_read_model_shadow_v2() to service_role;

create function public.odm_displayable_coverage_recovery_report_v1()
returns jsonb language sql stable set search_path='' as $$
with a as (
 select count(*) total,count(*) filter(where recovery_status='recoverable') recoverable,
  count(*) filter(where recovery_status='blocked') blocked,
  count(*) filter(where recovery_status='recoverable' and normalized_city='Tanger') tanger,
  count(*) filter(where recovery_status='recoverable' and normalized_city='Kénitra') kenitra
 from public.odm_displayable_coverage_recovery_audit_v1
), rm as (
 select count(*) rows,count(*) filter(where normalized_city='Tanger') tanger_rows,
  count(*) filter(where normalized_city='Kénitra') kenitra_rows,
  count(*) filter(where display_tier_v2='blocked') blocked_rows
 from public.odm_search_read_model_shadow_v2
)
select jsonb_build_object(
 'audit_version','odm_displayable_coverage_recovery_v1',
 'audit',jsonb_build_object('total',a.total,'recoverable',a.recoverable,'blocked',a.blocked,'tanger_recoverable',a.tanger,'kenitra_recoverable',a.kenitra),
 'read_model',jsonb_build_object('rows',rm.rows,'tanger_rows',rm.tanger_rows,'kenitra_rows',rm.kenitra_rows),
 'gates',jsonb_build_object(
  'only_canonical_link_policy_recovered',not exists(select 1 from public.odm_displayable_coverage_recovery_shadow_v1 where recovery_status='recoverable' and resolved_display_policy<>'canonical_link_only'),
  'only_public_sitemap_recovered',not exists(select 1 from public.odm_displayable_coverage_recovery_shadow_v1 where recovery_status='recoverable' and seed_provider<>'public_sitemap'),
  'all_recovered_fresh_or_aging',not exists(select 1 from public.odm_displayable_coverage_recovery_shadow_v1 where recovery_status='recoverable' and freshness_status_v2 not in ('fresh','aging')),
  'all_recovered_structured',not exists(select 1 from public.odm_displayable_coverage_recovery_shadow_v1 where recovery_status='recoverable' and (normalized_city is null or normalized_property_type is null or normalized_intent is null)),
  'blocked_rows_absent_from_read_model',rm.blocked_rows=0,
  'tanger_present',rm.tanger_rows>0,'kenitra_present',rm.kenitra_rows>0,
  'publication_remains_disabled',true,'public_activation_disabled',true),
 'shadow_only',true,'public_activation',false)
from a cross join rm;
$$;
revoke all on function public.odm_displayable_coverage_recovery_report_v1() from public,anon,authenticated;
grant execute on function public.odm_displayable_coverage_recovery_report_v1() to service_role;
