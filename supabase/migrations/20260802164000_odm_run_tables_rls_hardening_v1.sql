-- DATA V2 LOT 10 — ODM Run Tables RLS Hardening V1
-- Internal operational run logs. No public or authenticated access.

alter table public.odm_10e_enrichment_runs enable row level security;
alter table public.odm_10f_recovery_runs enable row level security;
alter table public.odm_10g_acquisition_runs enable row level security;

revoke all on table public.odm_10e_enrichment_runs from public, anon, authenticated;
revoke all on table public.odm_10f_recovery_runs from public, anon, authenticated;
revoke all on table public.odm_10g_acquisition_runs from public, anon, authenticated;

-- Least privilege required by the existing SECURITY INVOKER ODM functions:
-- INSERT + UPDATE for idempotent upserts; SELECT for operational reports.
revoke all on table public.odm_10e_enrichment_runs from service_role;
revoke all on table public.odm_10f_recovery_runs from service_role;
revoke all on table public.odm_10g_acquisition_runs from service_role;

grant select, insert, update on table public.odm_10e_enrichment_runs to service_role;
grant select, insert, update on table public.odm_10f_recovery_runs to service_role;
grant select, insert, update on table public.odm_10g_acquisition_runs to service_role;

comment on table public.odm_10e_enrichment_runs is
  'Internal ODM enrichment run log. RLS enabled; service_role-only operational access.';
comment on table public.odm_10f_recovery_runs is
  'Internal ODM structured recovery run log. RLS enabled; service_role-only operational access.';
comment on table public.odm_10g_acquisition_runs is
  'Internal ODM acquisition run log. RLS enabled; service_role-only operational access.';

create or replace function public.odm_run_tables_rls_security_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with t as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled,
         has_table_privilege('anon', c.oid, 'select') as anon_select,
         has_table_privilege('anon', c.oid, 'insert') as anon_insert,
         has_table_privilege('authenticated', c.oid, 'select') as authenticated_select,
         has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert,
         has_table_privilege('service_role', c.oid, 'select') as service_select,
         has_table_privilege('service_role', c.oid, 'insert') as service_insert,
         has_table_privilege('service_role', c.oid, 'update') as service_update,
         has_table_privilege('service_role', c.oid, 'delete') as service_delete,
         has_table_privilege('service_role', c.oid, 'truncate') as service_truncate
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in ('odm_10e_enrichment_runs','odm_10f_recovery_runs','odm_10g_acquisition_runs')
), f as (
  select count(*) filter(where p.prosecdef) as security_definer_functions,
         count(*) filter(where has_function_privilege('anon',p.oid,'execute')) as anon_executable,
         count(*) filter(where has_function_privilege('authenticated',p.oid,'execute')) as authenticated_executable,
         count(*) filter(where has_function_privilege('service_role',p.oid,'execute')) as service_executable
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('odm_10e_apply_url_enrichment','odm_10f_apply_structured_recovery','odm_10g_apply_discovery_coverage')
)
select jsonb_build_object(
  'audit_version','odm_run_tables_rls_hardening_v1',
  'metrics',jsonb_build_object(
    'table_count',(select count(*) from t),
    'rls_enabled_count',(select count(*) filter(where rls_enabled) from t),
    'service_executable_functions',f.service_executable
  ),
  'gates',jsonb_build_object(
    'all_three_tables_present',(select count(*)=3 from t),
    'rls_enabled_on_all',(select bool_and(rls_enabled) from t),
    'anon_has_no_table_access',(select bool_and(not anon_select and not anon_insert) from t),
    'authenticated_has_no_table_access',(select bool_and(not authenticated_select and not authenticated_insert) from t),
    'service_role_has_required_access',(select bool_and(service_select and service_insert and service_update) from t),
    'service_role_has_no_destructive_access',(select bool_and(not service_delete and not service_truncate) from t),
    'functions_remain_security_invoker',f.security_definer_functions=0,
    'anon_cannot_execute_functions',f.anon_executable=0,
    'authenticated_cannot_execute_functions',f.authenticated_executable=0,
    'service_role_can_execute_functions',f.service_executable=3
  ),
  'public_activation',false,
  'shadow_only',true
) from f;
$$;

revoke all on function public.odm_run_tables_rls_security_report_v1() from public, anon, authenticated;
grant execute on function public.odm_run_tables_rls_security_report_v1() to service_role;