import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260809013000_price_coverage_recovery_shadow_governance.sql';
const sql = fs.readFileSync(path, 'utf8');
const lower = sql.toLowerCase();

for (const token of [
  "normalization_evidence ->> 'price_recovery' = 'odm_price_coverage_recovery_v1'",
  'coalesce(d.price_mad, 0) <= 0',
  "t.economic_status = 'trusted'",
  "t.action = 'activate_price'",
  't.reconciled_price_mad = d.normalized_price_mad',
  'set normalized_price_mad = null',
  'price_per_m2_mad = null',
  'normalized_price_m2 = null',
  "normalization_evidence = coalesce(d.normalization_evidence, '{}'::jsonb) - 'price_recovery'",
  'odm_materialize_price_coverage_recovery_v1',
  'odm_price_coverage_recovery_audit_v1',
  "'updated_rows', 0",
  "'publication_activated', false",
  "'ranking_policy_changed', false",
  "'mode', 'audit_only'",
  'not exists (',
  'prior.recovered_price_mad = e.recovered_price_mad',
  "'shadow_public_leaks'",
  "'shadow_is_non_public'",
  'service_role',
]) {
  assert.ok(lower.includes(token.toLowerCase()), `missing contract token: ${token}`);
}

const fnMatch = sql.match(/create or replace function public\.odm_materialize_price_coverage_recovery_v1\(\)[\s\S]*?\n\$\$;/i);
assert.ok(fnMatch, 'materialize function body missing');
const fn = fnMatch[0].toLowerCase();
assert.ok(fn.includes('insert into public.odm_price_coverage_recovery_audit_v1'), 'audit insert must remain');
assert.ok(!/update\s+public\.thin_index_search_documents/i.test(fn), 'shadow materializer must not update public thin index');
assert.ok(!/set\s+normalized_price_mad\s*=\s*[^n]/i.test(fn), 'shadow materializer must not materialize a public price');

assert.ok(!/set\s+(display_eligibility|ranking_quality_boost|ranking_score)/i.test(sql), 'ranking/display policy must not change');
assert.ok(!/grant\s+(select|insert|update|delete|execute).*\b(anon|authenticated)\b/i.test(sql), 'public roles must not receive privileges');
assert.ok(!/odm03_extract_price_mad|recovered_price\s+between\s+\d+/i.test(sql), 'generic price thresholds/extractors are out of scope');

console.log('PRICE-COVERAGE-RECOVERY-1 shadow governance contract passed');
