import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260730233000_odm_search_progressive_canary_v1.sql','utf8').toLowerCase();
const fix=fs.readFileSync('supabase/migrations/20260731064500_odm_progressive_canary_timeout_fix.sql','utf8').toLowerCase();
const sql=`${base}\n${fix}`;
for (const token of [
  'odm_search_progressive_canary_report_v1',
  'jsonb_build_array(1,5,10,25)',
  'cohorts_monotonic',
  'all_rows_shadow_only',
  'public_activation_disabled',
  'active_search_unchanged',
  'serp_unchanged',
  'publication_remains_disabled',
  'security invoker',
  "'audit_window',250"
]) assert.ok(sql.includes(token),`missing ${token}`);
for (const forbidden of [
  'update public.',
  'insert into public.',
  'delete from public.',
  'security definer',
  'publication_eligible=true',
  'ranking_eligible=true'
]) assert.ok(!sql.includes(forbidden),`forbidden ${forbidden}`);
assert.equal((fix.match(/search_odm_assembled_shadow_v1/g)||[]).length,1,'assembly must execute once');
assert.ok(fix.includes(",false,false,false,250"),'audit window must be bounded to 250');
assert.ok(fix.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(fix.includes("'public_activation',false"),'public activation must remain false');
console.log('ODM Search Progressive Canary V1 timeout contract passed');