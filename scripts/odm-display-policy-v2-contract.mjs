import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync('supabase/migrations/20260730110000_odm_display_policy_v2.sql', 'utf8');

const required = [
  'odm_display_policy_shadow_v2',
  'displayable_ranked',
  'displayable_degraded',
  'decision_reasons_v2',
  'no_forbidden_source_displayable',
  'no_non_real_estate_displayable',
  'no_low_quality_blocked_only_for_score',
  'all_degraded_have_reason',
  'publication_remains_disabled',
  'ranking_remains_disabled',
  'security_invoker = true',
  'to service_role'
];
for (const token of required) assert.ok(sql.includes(token), `missing ${token}`);

const forbidden = [
  'update public.thin_index_search_documents',
  'update public.property_listings',
  'insert into public.property_listings',
  'create or replace view public.thin_index_display_eligible_v1'
];
for (const token of forbidden) assert.ok(!sql.toLowerCase().includes(token), `forbidden ${token}`);

assert.ok(sql.includes("in ('D','E','REJECTED','UNSCORED') then 'displayable_degraded'"));
assert.ok(sql.includes("resolved_display_policy in ('internal_signal_only','blocked') then 'blocked'"));
assert.ok(sql.includes('false::boolean as publication_eligible'));
assert.ok(sql.includes('false::boolean as ranking_eligible'));

console.log('ODM Display Policy V2 contract passed');
