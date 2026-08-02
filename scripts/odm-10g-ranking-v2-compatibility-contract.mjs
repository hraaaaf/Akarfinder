import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260802113000_odm_10g_ranking_v2_compatibility.sql';
const sql = fs.readFileSync(path, 'utf8').toLowerCase();

for (const token of [
  'odm_10g_v2_compatibility_runs',
  'odm_10g_ranking_formula_hash_v2',
  'odm_10g_apply_discovery_coverage_v2',
  'ranking_formula_unchanged',
  'ranking_rows_recomputed',
  'public_activation',
  'publication_activated',
  'enable row level security',
  'revoke all',
  'service_role',
  "normalization_version = 'odm_10g_v2'",
]) assert.ok(sql.includes(token), `missing ${token}`);

assert.ok(sql.includes("p.proname in ('search_odm_ranking_shadow_v2','odm_ranking_v2_report')"), 'Ranking V2 formula hash must be explicit');
assert.ok(!/grant\s+(select|insert|update|delete|execute).*\b(anon|authenticated)\b/i.test(sql), 'public roles must not receive access');
assert.ok(!/create\s+or\s+replace\s+function\s+public\.search_odm_ranking_shadow_v2/i.test(sql), 'Ranking V2 formula must not be replaced');
assert.ok(!/set\s+public_activation\s*=\s*true/i.test(sql), 'public activation must remain disabled');

console.log('ODM-10G Ranking V2 compatibility contract passed');