import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/migrations/20260730194500_odm_search_assembly_v1.sql';
const sql=fs.readFileSync(path,'utf8');
const lower=sql.toLowerCase();

for (const token of [
  'search_odm_assembled_shadow_v1',
  'odm_search_assembly_report_v1',
  'search_odm_noise_controls_shadow_v1',
  'search_odm_explained_shadow_v1',
  'assembly_metadata',
  'all_rows_have_explanations',
  'all_rows_have_assembly_metadata',
  'all_rows_shadow_only',
  'public_activation_disabled',
  'blocked_rows_absent',
  'active_search_unchanged',
  'serp_unchanged',
  'publication_remains_disabled',
  'security invoker',
  'to service_role'
]) assert.ok(lower.includes(token),`missing ${token}`);

for (const forbidden of [
  'create or replace function public.search_public_representations_v1',
  'create or replace function public.search_thin_index_v3',
  'update public.thin_index_search_documents',
  'update public.property_listings',
  'insert into public.thin_index_search_documents',
  'publication_eligible=true',
  'ranking_eligible=true',
  'security definer'
]) assert.ok(!lower.includes(forbidden),`forbidden ${forbidden}`);

assert.ok(lower.includes("'shadow_only',true"),'assembly must be shadow only');
assert.ok(lower.includes("'public_activation',false"),'public activation must remain false');
assert.ok(lower.includes('join explained e using(observation_id)'),'controlled and explained results must join by observation');
assert.ok(lower.includes('order by c.lane_weight asc,c.ranking_score_v2 desc'),'ranking order must be preserved');
console.log('ODM Search Assembly V1 contract passed');