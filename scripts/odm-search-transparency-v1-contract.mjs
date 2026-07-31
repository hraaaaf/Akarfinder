import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260731094500_odm_search_transparency_v1.sql','utf8').toLowerCase();
const fix=fs.readFileSync('supabase/migrations/20260731100000_odm_search_transparency_alias_fix.sql','utf8').toLowerCase();
const sql=`${base}\n${fix}`;
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
  'to service_role',
  'source_rows',
  'total_rows'
]) assert.ok(sql.includes(token),`missing ${token}`);
for (const forbidden of [
  'update public.',
  'insert into public.',
  'delete from public.',
  'security definer',
  'publication_eligible=true',
  'ranking_eligible=true'
]) assert.ok(!sql.includes(forbidden),`forbidden ${forbidden}`);
assert.ok(fix.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(fix.includes("'public_activation',false"),'public activation must remain false');
assert.ok(fix.includes("false,false,false,250"),'audit window must stay bounded to 250');
assert.ok(fix.includes('b.source_rows'),'source rows must be explicitly qualified');
assert.ok(fix.includes('t.total_rows'),'total rows must be explicitly qualified');
console.log('ODM Search Transparency V1 alias-safe contract passed');
