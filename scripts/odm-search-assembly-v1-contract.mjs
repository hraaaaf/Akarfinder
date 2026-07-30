import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260730194500_odm_search_assembly_v1.sql','utf8').toLowerCase();
const singlePass=fs.readFileSync('supabase/migrations/20260730203000_odm_search_assembly_single_pass_fix.sql','utf8').toLowerCase();
const syntaxFix=fs.readFileSync('supabase/migrations/20260730211500_odm_search_assembly_syntax_fix.sql','utf8').toLowerCase();
const sql=`${base}\n${singlePass}\n${syntaxFix}`;

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

assert.ok(syntaxFix.includes("'shadow_only',true"),'assembly must stay shadow only');
assert.ok(syntaxFix.includes("'public_activation',false"),'public activation must stay false');
assert.equal((syntaxFix.match(/search_odm_ranking_shadow_v2/g)||[]).length,1,'Ranking V2 must execute once');
assert.ok(!syntaxFix.includes('search_odm_noise_controls_shadow_v1'),'assembly must not rescan through noise controls');
assert.ok(!syntaxFix.includes('search_odm_explained_shadow_v1'),'assembly must not rescan through explanations');
assert.ok(syntaxFix.includes('order by lane_weight asc,ranking_score_v2 desc'),'ranking order must be preserved');

const withoutStrings=syntaxFix.replace(/'(?:''|[^'])*'/g,"''");
let balance=0;
for (const char of withoutStrings) {
  if (char==='(') balance++;
  if (char===')') balance--;
  assert.ok(balance>=0,'closing parenthesis appears before its opener');
}
assert.equal(balance,0,'SQL parentheses must be balanced');
assert.match(syntaxFix,/or\s*\(p\.mode='low_noise'\s+and\s*\(/,'low-noise mode must be present');
assert.match(syntaxFix,/economic_policy_blocked[\s\S]*?\)\)\)\)\s*\)\s*\)/,'low-noise predicate must close all nested groups');
console.log('ODM Search Assembly V1 single-pass syntax contract passed');
