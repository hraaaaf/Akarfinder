import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/migrations/20260730140000_odm_ranking_v2.sql';
const sql=fs.readFileSync(path,'utf8');
const lower=sql.toLowerCase();

for (const token of [
  'search_odm_ranking_shadow_v2',
  'odm_ranking_v2_report',
  'displayable_ranked',
  'displayable_degraded',
  'lane_weight',
  'text_relevance',
  'quality_component',
  'freshness_component',
  'completeness_component',
  'economic_component',
  'evidence_component',
  'degradation_penalty',
  'ranking_score_v2',
  "'odm_ranking_v2'",
  'blocked_rows_absent',
  'all_scores_bounded',
  'all_degraded_penalized',
  'low_quality_not_hard_excluded',
  'active_search_unchanged',
  'serp_unchanged',
  'security invoker',
  'to service_role'
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

assert.ok(lower.includes("display_tier_v2 in ('displayable_ranked','displayable_degraded')"),'ranking must include both displayable lanes');
assert.ok(lower.includes("case when v.display_tier_v2='displayable_ranked' then 0::smallint else 1::smallint end"),'ranked lane must precede degraded lane');
assert.ok(lower.includes('order by lane_weight asc, ranking_score_v2 desc'),'deterministic lane-first ranking required');
console.log('ODM Ranking V2 contract passed');
