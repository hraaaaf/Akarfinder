import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql=fs.readFileSync('supabase/migrations/20260731094500_odm_search_transparency_v1.sql','utf8').toLowerCase();
for (const token of [
  'odm_search_transparency_report_v1',
  'audit_window',
  'source_breakdown_complete',
  'price_coverage_percent',
  'surface_coverage_percent',
  'all_rows_explained',
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
assert.ok(sql.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(sql.includes("'public_activation',false"),'public activation must remain false');
assert.ok(sql.includes("false,false,false,250"),'audit window must stay bounded to 250');
console.log('ODM Search Transparency V1 contract passed');
