import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260731103000_odm_search_depth_certification_v1.sql','utf8').toLowerCase();
const fix=fs.readFileSync('supabase/migrations/20260731104500_odm_search_depth_certification_dimension_fix.sql','utf8').toLowerCase();
const sql=`${base}\n${fix}`;
for (const token of [
  'odm_search_depth_certification_report_v1',
  'geographic_scenarios_with_results',
  'structured_scenarios_with_results',
  'geographic_zero_result_scenarios',
  'structured_zero_result_scenarios',
  'field_completeness',
  'fully_structured',
  'ranked_share_percent',
  'price_coverage_percent',
  'surface_coverage_percent',
  'blocked_rows_absent',
  'all_rows_shadow_only',
  'public_activation_disabled',
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
  'security definer',
  'publication_eligible=true',
  'ranking_eligible=true'
]) assert.ok(!sql.includes(forbidden),`forbidden ${forbidden}`);
assert.equal((fix.match(/\('(?:geo_|structured_)/g)||[]).length,10,'ten priority scenarios required');
assert.ok(fix.includes("false,false,false,250"),'audit window must stay bounded to 250');
assert.ok(fix.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(fix.includes("'public_activation',false"),'public activation must remain false');
console.log('ODM Search Depth Certification V1 dimension-aware contract passed');
