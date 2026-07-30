import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/migrations/20260730152000_odm_search_noise_controls_v1.sql';
const sql=fs.readFileSync(path,'utf8');
const lower=sql.toLowerCase();

for (const token of [
  'odm_search_control_capabilities_v1',
  'search_odm_noise_controls_shadow_v1',
  'odm_search_noise_controls_report_v1',
  "'default'",
  "'maximum_coverage'",
  "'low_noise'",
  'p_min_price','p_max_price','p_min_surface','p_max_surface',
  'p_fresh_only','p_require_price','p_require_surface',
  'mode_counts_monotonic','maximum_coverage_preserves_rankable',
  'unsupported_filters_not_fabricated','active_search_unchanged','serp_unchanged',
  'security invoker','to service_role'
]) assert.ok(lower.includes(token.toLowerCase()),`missing ${token}`);

for (const forbidden of [
  'create or replace function public.search_public_representations_v1',
  'create or replace function public.search_thin_index_v3',
  'update public.thin_index_search_documents',
  'update public.property_listings',
  'insert into public.thin_index_search_documents',
  'publication_eligible=true',
  'ranking_eligible=true'
]) assert.ok(!lower.includes(forbidden),`forbidden ${forbidden}`);

assert.ok(lower.includes("'photo',false"),'photo capability must remain honest');
assert.ok(lower.includes("'owner',false"),'owner capability must remain honest');
assert.ok(lower.includes("'premium',false"),'premium capability must remain honest');
assert.ok(lower.includes("'partner',false"),'partner capability must remain honest');
assert.ok(lower.includes("p.mode='maximum_coverage'"),'maximum coverage mode missing');
assert.ok(lower.includes("p.mode='default'"),'default mode missing');
assert.ok(lower.includes("p.mode='low_noise'"),'low noise mode missing');
assert.ok(lower.includes('order by lane_weight asc,ranking_score_v2 desc'),'lane-first ordering required');
console.log('ODM Search Noise Controls V1 contract passed');
