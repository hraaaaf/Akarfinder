import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=fs.readFileSync('supabase/migrations/20260730140000_odm_ranking_v2.sql','utf8');
const queryFix=fs.readFileSync('supabase/migrations/20260730143000_odm_ranking_v2_structured_query_fix.sql','utf8');
const reportFix=fs.readFileSync('supabase/migrations/20260730144500_odm_ranking_v2_report_gate_fix.sql','utf8');
const sql=`${base}\n${queryFix}\n${reportFix}`;
const lower=sql.toLowerCase();

for (const token of [
  'search_odm_ranking_shadow_v2','odm_ranking_v2_report','displayable_ranked','displayable_degraded',
  'lane_weight','text_relevance','quality_component','freshness_component','completeness_component',
  'economic_component','evidence_component','degradation_penalty','ranking_score_v2',
  'blocked_rows_absent','all_scores_bounded','all_degraded_penalized',
  'low_quality_rows_rankable_when_present','active_search_unchanged','serp_unchanged',
  'security invoker','to service_role','odm_ranking_v2_1_structured_query','odm_ranking_v2_1'
]) assert.ok(lower.includes(token.toLowerCase()),`missing ${token}`);

for (const forbidden of [
  'create or replace function public.search_public_representations_v1',
  'create or replace function public.search_thin_index_v3',
  'update public.thin_index_search_documents','update public.property_listings',
  'insert into public.thin_index_search_documents','publication_eligible=true','ranking_eligible=true'
]) assert.ok(!lower.includes(forbidden),`forbidden ${forbidden}`);

assert.ok(queryFix.includes("display_tier_v2 in ('displayable_ranked','displayable_degraded')"),'ranking must include both displayable lanes');
assert.ok(queryFix.includes("case when v.display_tier_v2='displayable_ranked' then 0::smallint else 1::smallint end"),'ranked lane must precede degraded lane');
assert.ok(queryFix.includes('order by lane_weight asc,ranking_score_v2 desc'),'deterministic lane-first ranking required');
assert.ok(queryFix.includes('or q.city is not null'),'city filter must prevent redundant text hard-gating');
assert.ok(queryFix.includes('or q.property_type is not null'),'property filter must prevent redundant text hard-gating');
assert.ok(queryFix.includes('or q.intent is not null'),'intent filter must prevent redundant text hard-gating');
assert.ok(queryFix.includes('q.q_ts is null\n      or d.search_vector @@ q.q_ts'),'query-only searches must still require text relevance');
assert.ok(reportFix.includes("count(*) filter(where 'low_or_unscored_quality'=any(decision_reasons_v2) and display_tier_v2='displayable_degraded')"),'low-quality gate must test rankability when present');
console.log('ODM Ranking V2.1 contract passed');
