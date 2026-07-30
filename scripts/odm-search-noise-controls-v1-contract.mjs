import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260730152000_odm_search_noise_controls_v1.sql','utf8');
const fix=fs.readFileSync('supabase/migrations/20260730161000_odm_search_noise_controls_report_timeout_fix.sql','utf8');
const sql=`${base}\n${fix}`;
const lower=sql.toLowerCase();
for (const token of ['odm_search_control_capabilities_v1','search_odm_noise_controls_shadow_v1','odm_search_noise_controls_report_v1',"'default'","'maximum_coverage'","'low_noise'",'p_min_price','p_max_price','p_min_surface','p_max_surface','p_fresh_only','p_require_price','p_require_surface','mode_counts_monotonic','unsupported_filters_not_fabricated','active_search_unchanged','serp_unchanged','security invoker','to service_role','materialized','odm_search_noise_controls_v1_2']) assert.ok(lower.includes(token.toLowerCase()),`missing ${token}`);
for (const forbidden of ['create or replace function public.search_public_representations_v1','create or replace function public.search_thin_index_v3','update public.thin_index_search_documents','update public.property_listings','insert into public.thin_index_search_documents','publication_eligible=true','ranking_eligible=true']) assert.ok(!lower.includes(forbidden),`forbidden ${forbidden}`);
for (const capability of ['photo','owner','premium','partner']) assert.ok(base.toLowerCase().includes(`'${capability}',false`),`${capability} capability must remain honest`);
assert.ok(base.includes("p.mode='maximum_coverage'"));
assert.ok(base.includes("p.mode='default'"));
assert.ok(base.includes("p.mode='low_noise'"));
assert.ok(base.includes('order by lane_weight asc,ranking_score_v2 desc'));
assert.equal((fix.match(/search_odm_noise_controls_shadow_v1/g)||[]).length,1,'report must use one noise-control scan');
assert.ok(!fix.includes('join public.odm_display_policy_shadow_v2'),'report must not rescan Display Policy');
console.log('ODM Search Noise Controls V1 contract passed');
