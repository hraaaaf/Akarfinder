import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql=fs.readFileSync('supabase/migrations/20260731103000_odm_search_depth_certification_v1.sql','utf8').toLowerCase();
for (const token of [
  'odm_search_depth_certification_report_v1',
  'zero_result_scenarios',
  'scenarios_with_ranked_results',
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
assert.equal((sql.match(/\('(?:casablanca|rabat|marrakech|tanger|agadir|fes|kenitra)'/g)||[]).length,10,'ten priority scenarios required');
assert.ok(sql.includes("false,false,false,250"),'audit window must stay bounded to 250');
assert.ok(sql.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(sql.includes("'public_activation',false"),'public activation must remain false');
console.log('ODM Search Depth Certification V1 contract passed');
