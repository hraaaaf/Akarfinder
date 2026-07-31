import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql=fs.readFileSync('supabase/migrations/20260731114500_odm_final_release_gate_v1.sql','utf8').toLowerCase();
for (const token of [
  'odm_final_release_gate_report_v1',
  'blocked_by_data_depth',
  'ready_for_explicit_activation_review',
  'priority_city_depth',
  'structured_depth',
  'price_depth',
  'surface_depth',
  'ranked_depth',
  'blocked_rows_absent',
  'all_rows_shadow_only',
  'public_activation_disabled',
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
assert.ok(sql.includes("false,false,false,100"),'audit window must stay bounded to 100');
assert.ok(sql.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(sql.includes("'public_activation',false"),'public activation must remain false');
console.log('ODM Final Release Gate V1 contract passed');
