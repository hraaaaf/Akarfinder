import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260730140000_odm_ranking_v2.sql','utf8');
const fix=fs.readFileSync('supabase/migrations/20260730143000_odm_ranking_v2_structured_query_fix.sql','utf8');
const sql=`${base}\n${fix}`;
const lower=sql.toLowerCase();

for (const token of [
  'search_odm_ranking_shadow_v2','odm_ranking_v2_report','displayable_ranked','displayable_degraded',
  'lane_weight','text_relevance','quality_component','freshness_component','completeness_component',
  'economic_component','evidence_component','degradation_penalty','ranking_score_v2',
  'blocked_rows_absent','all_scores_bounded','all_degraded_penalized','low_quality_not_hard_excluded',
  'active_search_unchanged','serp_unchanged','security invoker','to service_role',
  'odm_ranking_v2_1_structured_query'
]) assert.ok(lower.includes(token.toLowerCase()),`missing ${token}`);

for (const forbidden of [
  'create or replace function public.search_public_representations_v1',
  'create or replace function public.search_thin_index_v3',
  'update public.thin_index_search_documents','update public.property_listings',
  'insert into public.thin_index_search_documents','publication_eligible=true','ranking_eligible=true'
]) assert.ok(!lower.includes(forbidden),`forbidden ${forbidden}`);

assert.ok(fix.includes("display_tier_v2 in ('displayable_ranked','displayable_degraded')"),'ranking must include both displayable lanes');
assert.ok(fix.includes("case when v.display_tier_v2='displayable_ranked' then 0::smallint else 1::smallint end"),'ranked lane must precede degraded lane');
assert.ok(fix.includes('order by lane_weight asc,ranking_score_v2 desc'),'deterministic lane-first ranking required');
assert.ok(fix.includes('or q.city is not null'),'city filter must prevent redundant text hard-gating');
assert.ok(fix.includes('or q.property_type is not null'),'property filter must prevent redundant text hard-gating');
assert.ok(fix.includes('or q.intent is not null'),'intent filter must prevent redundant text hard-gating');
assert.ok(fix.includes('q.q_ts is null\n      or d.search_vector @@ q.q_ts'),'query-only searches must still require text relevance');
console.log('ODM Ranking V2 structured-query contract passed');
