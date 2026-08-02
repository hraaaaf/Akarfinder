import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260802164000_odm_run_tables_rls_hardening_v1.sql';
const sql = fs.readFileSync(path, 'utf8').toLowerCase();

for (const table of [
  'odm_10e_enrichment_runs',
  'odm_10f_recovery_runs',
  'odm_10g_acquisition_runs',
]) {
  assert(sql.includes(`alter table public.${table} enable row level security`), `${table}: RLS missing`);
  assert(sql.includes(`revoke all on table public.${table} from public, anon, authenticated`), `${table}: public revoke missing`);
  assert(sql.includes(`grant select, insert, update on table public.${table} to service_role`), `${table}: least-privilege grant missing`);
}

assert(sql.includes('security invoker'), 'report must remain SECURITY INVOKER');
assert(!sql.includes('create policy'), 'no public/authenticated policies may be introduced');
assert(sql.includes('service_role_has_no_destructive_access'), 'destructive access gate missing');
assert(sql.includes('anon_cannot_execute_functions'), 'anon RPC gate missing');
assert(sql.includes('authenticated_cannot_execute_functions'), 'authenticated RPC gate missing');
assert(sql.includes('public_activation\',false'), 'public activation must remain false');

console.log('ODM Run Tables RLS Hardening V1 contract: OK');
