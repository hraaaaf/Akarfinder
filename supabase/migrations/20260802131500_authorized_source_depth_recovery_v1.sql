-- DATA V2 LOT 7 — Authorized Source Depth Recovery V1
-- Certify safe economic promotions and the authorized acquisition backlog.

create or replace view public.odm_authorized_source_depth_recovery_shadow_v1
with (security_invoker=true) as
with authorized as (
  select v.observation_id,v.seed_id,v.source_domain,v.seed_provider,v.canonical_url,
         v.normalized_city,v.normalized_property_type,v.normalized_intent,
         v.normalized_price_mad,v.normalized_surface_m2,
         v.resolved_display_policy,v.freshness_status_v2,
         s.economic_status,s.principal_economic_type,s.principal_value_mad,s.observed_at as economic_observed_at,
         case
           when v.resolved_display_policy not in ('canonical_link_only','partner_content','full_display') then 'blocked_source_policy'
           when v.normalized_price_mad is not null then 'already_has_price'
           when s.economic_status <> 'trusted' then 'blocked_not_trusted'
           when v.normalized_intent is null then 'blocked_intent_missing'
           when s.principal_economic_type='sale_total' and v.normalized_intent<>'sale' then 'blocked_intent_mismatch'
           when s.principal_economic_type in ('rent_monthly','rent_daily','rent_weekly') and v.normalized_intent<>'rent' then 'blocked_intent_mismatch'
           when s.principal_value_mad is null or s.principal_value_mad < 1000 or s.principal_value_mad > 50000000 then 'blocked_value_bounds'
           else 'recoverable_price'
         end as price_recovery_status
  from public.odm_display_policy_shadow_v2 v
  left join public.odm_economic_observation_state_shadow_v1 s using(observation_id)
  where v.resolved_display_policy in ('canonical_link_only','partner_content','full_display')
), provider_stats as (
  select provider,count(*)::bigint as candidate_count
  from public.discovery_candidates group by provider
)
select a.*,
       coalesce((select jsonb_object_agg(provider,candidate_count) from provider_stats),'{}'::jsonb) as discovery_provider_counts,
       not exists(select 1 from provider_stats where provider='public_sitemap') as public_sitemap_provider_missing,
       false as publication_eligible,
       false as ranking_eligible,
       'odm_authorized_source_depth_recovery_v1'::text as recovery_version
from authorized a;

revoke all on public.odm_authorized_source_depth_recovery_shadow_v1 from anon,authenticated;
grant select on public.odm_authorized_source_depth_recovery_shadow_v1 to service_role;

create or replace function public.odm_authorized_source_depth_recovery_report_v1()
returns jsonb
language sql
stable
set search_path=''
as $$
with s as (
  select count(*) as authorized_rows,
         count(*) filter(where price_recovery_status='recoverable_price') as safe_price_promotions,
         count(*) filter(where price_recovery_status='blocked_not_trusted') as blocked_not_trusted,
         count(*) filter(where price_recovery_status='blocked_intent_missing') as blocked_intent_missing,
         count(*) filter(where price_recovery_status='blocked_intent_mismatch') as blocked_intent_mismatch,
         count(*) filter(where price_recovery_status='blocked_value_bounds') as blocked_value_bounds,
         count(*) filter(where normalized_price_mad is not null) as existing_price_rows,
         count(*) filter(where normalized_surface_m2 is not null) as existing_surface_rows,
         bool_and(public_sitemap_provider_missing) as public_sitemap_provider_missing,
         max(discovery_provider_counts) as discovery_provider_counts
  from public.odm_authorized_source_depth_recovery_shadow_v1
)
select jsonb_build_object(
  'audit_version','odm_authorized_source_depth_recovery_v1',
  'metrics',jsonb_build_object(
    'authorized_rows',authorized_rows,
    'safe_price_promotions',safe_price_promotions,
    'blocked_not_trusted',blocked_not_trusted,
    'blocked_intent_missing',blocked_intent_missing,
    'blocked_intent_mismatch',blocked_intent_mismatch,
    'blocked_value_bounds',blocked_value_bounds,
    'existing_price_rows',existing_price_rows,
    'existing_surface_rows',existing_surface_rows,
    'discovery_provider_counts',discovery_provider_counts
  ),
  'gates',jsonb_build_object(
    'no_untrusted_price_promoted',safe_price_promotions=0,
    'public_sitemap_acquisition_missing',public_sitemap_provider_missing,
    'publication_remains_disabled',true,
    'ranking_remains_disabled',true,
    'public_activation_disabled',true
  ),
  'next_action','persist authorized public_sitemap acquisition before further price/surface promotion',
  'shadow_only',true,
  'public_activation',false
) from s;
$$;

revoke all on function public.odm_authorized_source_depth_recovery_report_v1() from public,anon,authenticated;
grant execute on function public.odm_authorized_source_depth_recovery_report_v1() to service_role;
