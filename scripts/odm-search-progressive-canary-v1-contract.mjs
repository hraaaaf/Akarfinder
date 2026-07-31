import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql=fs.readFileSync('supabase/migrations/20260730233000_odm_search_progressive_canary_v1.sql','utf8').toLowerCase();
for (const token of [
  'odm_search_progressive_canary_report_v1',
  'hashtextextended_mod_100',
  'jsonb_build_array(1,5,10,25)',
  'cohorts_monotonic',
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
assert.equal((sql.match(/hashtextextended\(a\.observation_id,20260730\)/g)||[]).length,1,'assignment must be computed once');
assert.ok(sql.includes("'shadow_only',true"),'must remain shadow only');
assert.ok(sql.includes("'public_activation',false"),'public activation must remain false');
console.log('ODM Search Progressive Canary V1 contract passed');