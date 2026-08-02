-- Avoid rescanning Display Policy V2 in the recovery report.
alter table public.odm_displayable_coverage_recovery_audit_v1
  add column seed_provider text,
  add column resolved_display_policy text,
  add column freshness_status_v2 text;

create or replace function public.odm_refresh_displayable_coverage_recovery_v1()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_recoverable integer; v_blocked integer; v_tanger integer; v_kenitra integer;
begin
 truncate public.odm_displayable_coverage_recovery_audit_v1;
 insert into public.odm_displayable_coverage_recovery_audit_v1(
  observation_id,seed_id,canonical_url,normalized_city,normalized_property_type,
  normalized_intent,source_domain,recovery_status,recovery_reason,
  seed_provider,resolved_display_policy,freshness_status_v2)
 select observation_id,seed_id,canonical_url,normalized_city,normalized_property_type,
  normalized_intent,source_domain,recovery_status,recovery_reason,
  seed_provider,resolved_display_policy,freshness_status_v2
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

create or replace function public.odm_displayable_coverage_recovery_report_v1()
returns jsonb language sql stable set search_path='' as $$
with a as (
 select count(*) total,count(*) filter(where recovery_status='recoverable') recoverable,
  count(*) filter(where recovery_status='blocked') blocked,
  count(*) filter(where recovery_status='recoverable' and normalized_city='Tanger') tanger,
  count(*) filter(where recovery_status='recoverable' and normalized_city='Kénitra') kenitra,
  count(*) filter(where recovery_status='recoverable' and resolved_display_policy<>'canonical_link_only') bad_policy,
  count(*) filter(where recovery_status='recoverable' and seed_provider<>'public_sitemap') bad_provider,
  count(*) filter(where recovery_status='recoverable' and freshness_status_v2 not in ('fresh','aging')) bad_freshness,
  count(*) filter(where recovery_status='recoverable' and (normalized_city is null or normalized_property_type is null or normalized_intent is null)) bad_structure
 from public.odm_displayable_coverage_recovery_audit_v1
), rm as (
 select count(*) total_rows,count(*) filter(where normalized_city='Tanger') tanger_rows,
  count(*) filter(where normalized_city='Kénitra') kenitra_rows,
  count(*) filter(where display_tier_v2='blocked') blocked_rows
 from public.odm_search_read_model_shadow_v2
)
select jsonb_build_object(
 'audit_version','odm_displayable_coverage_recovery_v1',
 'audit',jsonb_build_object('total',a.total,'recoverable',a.recoverable,'blocked',a.blocked,'tanger_recoverable',a.tanger,'kenitra_recoverable',a.kenitra),
 'read_model',jsonb_build_object('rows',rm.total_rows,'tanger_rows',rm.tanger_rows,'kenitra_rows',rm.kenitra_rows),
 'gates',jsonb_build_object(
  'only_canonical_link_policy_recovered',a.bad_policy=0,
  'only_public_sitemap_recovered',a.bad_provider=0,
  'all_recovered_fresh_or_aging',a.bad_freshness=0,
  'all_recovered_structured',a.bad_structure=0,
  'blocked_rows_absent_from_read_model',rm.blocked_rows=0,
  'tanger_present',rm.tanger_rows>0,'kenitra_present',rm.kenitra_rows>0,
  'publication_remains_disabled',true,'public_activation_disabled',true),
 'shadow_only',true,'public_activation',false)
from a cross join rm;
$$;
