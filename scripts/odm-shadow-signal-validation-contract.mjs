import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260729124000_odm_shadow_quality_tier_compatibility_v1.sql';
const sql = readFileSync(migrationPath, 'utf8');

const required = [
  "'A','B'",
  "'C'",
  "'D','E','REJECTED','UNSCORED'",
  'vertical_not_real_estate',
  'odm_shadow_signal_validation_report_v1',
  'shadow_has_eligible_rows',
  'no_quality_d_admission',
  'no_non_real_estate_admission',
  'no_missing_quality_tier_for_a_to_d',
  'odm_shadow_quality_tier_compat_v1',
  'service_role',
];

for (const token of required) {
  assert.ok(sql.includes(token), `missing ODM shadow signal contract token: ${token}`);
}

assert.match(sql, /when p_quality_tier in \('Q3_intelligence_ready','Q2_comparable','A','B'\) then 'eligible_primary'/);
assert.match(sql, /when p_quality_tier in \('Q1_contextual','Q0_link_only','C'\) then 'eligible_secondary'/);
assert.doesNotMatch(sql, /when p_quality_tier[^\n]*'D'[^\n]*then 'eligible_/);
assert.match(sql, /when vertical_classification <> 'real_estate_likely' then 'ineligible'/);
assert.match(sql, /revoke all on function public\.odm_shadow_signal_validation_report_v1\(\) from public, anon, authenticated/);

const forbidden = [
  /ODM_PUBLIC_CANARY_ENABLED\s*=\s*true/i,
  /ODM_PUBLIC_CANARY_PERCENT/i,
  /update\s+public\.property_listings/i,
  /delete\s+from/i,
  /truncate\s+/i,
  /captcha/i,
  /proxy/i,
  /stealth/i,
];

for (const pattern of forbidden) {
  assert.equal(pattern.test(sql), false, `forbidden ODM shadow behavior: ${pattern}`);
}

console.log('ODM-SHADOW-SIGNAL-VALIDATION-01 contract OK');
