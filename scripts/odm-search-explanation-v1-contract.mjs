import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/migrations/20260730190000_odm_search_explanation_v1.sql';
const sql=fs.readFileSync(path,'utf8');
const lower=sql.toLowerCase();

for (const token of [
  'search_odm_explained_shadow_v1',
  'odm_search_explanation_report_v1',
  'match_reasons','quality_reasons','freshness_reasons','ranking_reasons','warnings',
  'explanation_evidence','deterministic','llm_generated',
  'all_rows_explained','degraded_rows_warned','component_total_matches_rank',
  'active_search_unchanged','serp_unchanged','publication_remains_disabled',
  'security invoker','to service_role'
]) assert.ok(lower.includes(token),`missing ${token}`);

for (const forbidden of [
  'create or replace function public.search_public_representations_v1',
  'create or replace function public.search_thin_index_v3',
  'update public.thin_index_search_documents',
  'update public.property_listings',
  'insert into public.thin_index_search_documents',
  'publication_eligible=true',
  'ranking_eligible=true',
  'openai','anthropic','gemini','ollama'
]) assert.ok(!lower.includes(forbidden),`forbidden ${forbidden}`);

assert.ok(lower.includes("'llm_generated',false"),'LLM generation must be explicitly false');
assert.ok(lower.includes("'deterministic',true"),'deterministic provenance required');
assert.ok(lower.includes("display_tier_v2='displayable_degraded' then 'degraded_display_lane'"),'degraded lane warning required');
assert.ok(lower.includes("order by lane_weight asc,ranking_score_v2 desc"),'ranking order must be preserved');
assert.ok(lower.includes('with e as materialized'),'report must use one materialized explanation scan');
console.log('ODM Search Explanation V1 contract passed');