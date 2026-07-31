import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260731103000_odm_search_depth_certification_v1.sql','utf8').toLowerCase();
const dimensionFix=fs.readFileSync('supabase/migrations/20260731104500_odm_search_depth_certification_dimension_fix.sql','utf8').toLowerCase();
const timeoutFix=fs.readFileSync('supabase/migrations/20260731111500_odm_search_depth_certification_timeout_fix.sql','utf8').toLowerCase();
const sql=`${base}\n${dimensionFix}\n${timeoutFix}`;
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
assert.equal((timeoutFix.match(/\('(?:geo_|structured_)/g)||[]).length,10,'ten priority scenarios required');
assert.ok(timeoutFix.includes("false,false,false,100"),'audit window must stay bounded to 100');
assert.ok(timeoutFix.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(timeoutFix.includes("'public_activation',false"),'public activation must remain false');
console.log('ODM Search Depth Certification V1 bounded dimension-aware contract passed');
