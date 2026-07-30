import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/migrations/20260730224500_odm_search_canary_1pct_v1.sql';
const sql=fs.readFileSync(path,'utf8').toLowerCase();

for (const token of [
  'odm_search_canary_1pct_report_v1',
  'search_odm_assembled_shadow_v1',
  'hashtextextended',
  'mod(abs(',
  'selected_bucket',
  'target_percent',
  'deterministic_assignment',
  'exact_one_percent_bucket',
  'blocked_rows_absent',
  'all_rows_shadow_only',
  'public_activation_disabled',
  'all_rows_explained',
  'active_search_unchanged',
  'serp_unchanged',
  'publication_remains_disabled',
  'security invoker',
  'to service_role'
]) assert.ok(sql.includes(token),`missing ${token}`);

for (const forbidden of [
  'update public.',
  'insert into public.',
  'delete from public.',
  'create or replace function public.search_public_representations_v1',
  'create or replace function public.search_thin_index_v3',
  'publication_eligible=true',
  'ranking_eligible=true',
  'security definer'
]) assert.ok(!sql.includes(forbidden),`forbidden ${forbidden}`);

assert.ok(sql.includes("'shadow_only',true"),'canary must remain shadow only');
assert.ok(sql.includes("'public_activation',false"),'public activation must remain false');
assert.ok(sql.includes('where cohort_bucket=0'),'only bucket zero may enter the 1 percent canary');
console.log('ODM Search Canary 1 Percent V1 contract passed');
