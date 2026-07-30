import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260730194500_odm_search_assembly_v1.sql','utf8').toLowerCase();
const fix=fs.readFileSync('supabase/migrations/20260730203000_odm_search_assembly_single_pass_fix.sql','utf8').toLowerCase();
const sql=`${base}\n${fix}`;

for (const token of [
  'search_odm_assembled_shadow_v1',
  'odm_search_assembly_report_v1',
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
  'to service_role',
  'ranked as materialized',
  'search_odm_ranking_shadow_v2',
  'noise_controls_version',
  'explanation_version'
]) assert.ok(sql.includes(token),`missing ${token}`);

for (const forbidden of [
  'create or replace function public.search_public_representations_v1',
  'create or replace function public.search_thin_index_v3',
  'update public.thin_index_search_documents',
  'update public.property_listings',
  'insert into public.thin_index_search_documents',
  'publication_eligible=true',
  'ranking_eligible=true',
  'security definer'
]) assert.ok(!sql.includes(forbidden),`forbidden ${forbidden}`);

assert.ok(fix.includes("'shadow_only',true"),'assembly must stay shadow only');
assert.ok(fix.includes("'public_activation',false"),'public activation must stay false');
assert.equal((fix.match(/search_odm_ranking_shadow_v2/g)||[]).length,1,'Ranking V2 must execute once in fixed assembly');
assert.ok(!fix.includes('search_odm_noise_controls_shadow_v1'),'fixed assembly must not rescan ranking through noise controls');
assert.ok(!fix.includes('search_odm_explained_shadow_v1'),'fixed assembly must not rescan ranking through explanations');
assert.ok(fix.includes('order by lane_weight asc,ranking_score_v2 desc'),'ranking order must be preserved');
console.log('ODM Search Assembly V1 single-pass contract passed');
