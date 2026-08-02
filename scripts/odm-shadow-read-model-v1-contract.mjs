import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260802130000_odm_shadow_read_model_v1.sql';
const sql = fs.readFileSync(path, 'utf8').toLowerCase();

for (const token of [
  'create materialized view if not exists public.odm_search_read_model_shadow_v1',
  'odm_refresh_search_read_model_shadow_v1',
  'odm_final_release_gate_report_v2',
  'refresh materialized view public.odm_search_read_model_shadow_v1',
  'ranking_formula_unchanged',
  "values ('casablanca'),('rabat'),('marrakech'),('agadir'),('fès'),('tanger'),('kénitra')",
  'row_number() over(partition by r.normalized_city',
  'read_model_materialized',
  "'shadow_only',true",
  "'public_activation',false",
  'revoke all',
  'service_role',
]) assert.ok(sql.includes(token), `missing ${token}`);

assert.ok(!/grant\s+(select|execute).*\b(anon|authenticated)\b/i.test(sql), 'public roles must not receive access');
assert.ok(!/update\s+public\.thin_index_search_documents/i.test(sql), 'read model lot must not mutate thin index');
assert.ok(!/create\s+or\s+replace\s+function\s+public\.search_odm_ranking_shadow_v2/i.test(sql), 'Ranking V2 formula must not be replaced');
assert.ok(!/set\s+public_activation\s*=\s*true/i.test(sql), 'public activation must remain disabled');

console.log('ODM Shadow Read Model V1 contract passed');
