import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260809023000_ranking_quality_1_composed_display_policy.sql';
const sql = fs.readFileSync(path, 'utf8');
const lower = sql.toLowerCase();

for (const token of [
  'create or replace function public.odm06_set_display_policy()',
  "new.vertical_classification = 'non_real_estate'",
  "new.document_kind = 'category'",
  "new.document_kind = 'ambiguous'",
  "new.document_kind = 'listing' and v_detail_precision",
  "'provider_detail_listing'",
  "'ambiguous_property_result'",
  'least(v_base_boost, 0.05::real)',
  'vertical_classification,',
  'document_kind,',
  'document_kind_version',
  'd.display_eligibility is distinct from e.expected_eligibility',
  'd.display_eligibility_reason is distinct from e.expected_reason',
  'd.ranking_quality_boost is distinct from e.expected_boost',
  'create or replace function public.odm_ranking_quality_1_report_v1()',
  "'policy_drift_rows'",
  "'non_real_estate_public_rows'",
  "'category_public_rows'",
  "'ambiguous_primary_rows'",
  "'listing_with_ambiguous_policy_rows'",
  "'ranking_v2_changed', false",
  "'acquisition_changed', false",
  'service_role',
]) {
  assert.ok(lower.includes(token.toLowerCase()), `missing contract token: ${token}`);
}

for (const detailVersion of [
  'odm_agenz_detail_precision_v1',
  'odm_avito_detail_precision_v1',
  'odm_masaken_detail_precision_v1',
  'odm_mouldar_detail_precision_v1',
  'odm_mubawab_detail_geo_precision_v1',
]) {
  assert.ok(lower.includes(detailVersion), `detail precision override missing: ${detailVersion}`);
}

const triggerMatch = sql.match(/create trigger zzz_thin_index_display_policy_write[\s\S]*?execute function public\.odm06_set_display_policy\(\);/i);
assert.ok(triggerMatch, 'composed display-policy trigger missing');
const trigger = triggerMatch[0].toLowerCase();
for (const watchedColumn of [
  'canonical_url',
  'seed_provider',
  'freshness_status',
  'quality_tier',
  'quality_score',
  'vertical_classification',
  'document_kind',
  'document_kind_version',
]) {
  assert.ok(trigger.includes(watchedColumn), `trigger must watch ${watchedColumn}`);
}

const setterMatch = sql.match(/create or replace function public\.odm06_set_display_policy\(\)[\s\S]*?\n\$\$;/i);
assert.ok(setterMatch, 'composed ODM-06 setter body missing');
const setter = setterMatch[0].toLowerCase();
assert.ok(setter.indexOf("new.vertical_classification = 'non_real_estate'") < setter.indexOf("new.document_kind = 'category'"), 'vertical purity must precede document-kind overrides');
assert.ok(setter.indexOf("new.document_kind = 'category'") < setter.indexOf("new.document_kind = 'ambiguous'"), 'CATEGORY must be resolved before AMBIGUOUS');
assert.ok(setter.indexOf("new.document_kind = 'ambiguous'") < setter.indexOf("new.document_kind = 'listing' and v_detail_precision"), 'AMBIGUOUS cap must precede detail LISTING override');

assert.ok(!/create\s+or\s+replace\s+function\s+public\.odm_ranking_v2_/i.test(sql), 'Ranking V2 scoring/search functions are out of scope');
assert.ok(!/update\s+public\.source_offer_seeds/i.test(sql), 'source acquisition is out of scope');
assert.ok(!/insert\s+into\s+public\.source_offer_seeds/i.test(sql), 'new source acquisition is out of scope');
assert.ok(!/grant\s+(select|insert|update|delete|execute).*\b(anon|authenticated)\b/i.test(sql), 'public roles must not receive privileges');
assert.ok(!/alter\s+table\s+public\.thin_index_search_documents/i.test(sql), 'schema redesign is out of scope');

console.log('RANKING-QUALITY-1 composed display policy contract PASS');
