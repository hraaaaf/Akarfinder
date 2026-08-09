import fs from 'node:fs';
import assert from 'node:assert/strict';

const policyPath = 'supabase/migrations/20260809023000_ranking_quality_1_composed_display_policy.sql';
const dependencyPath = 'supabase/migrations/20260809023100_ranking_quality_1_trigger_dependencies.sql';
const sql = fs.readFileSync(policyPath, 'utf8');
const dependencySql = fs.readFileSync(dependencyPath, 'utf8');
const lower = sql.toLowerCase();
const dependencyLower = dependencySql.toLowerCase();

for (const token of [
  'create or replace function public.odm06_set_display_policy()',
  "new.vertical_classification is distinct from 'real_estate_likely'",
  "new.document_kind = 'category'",
  "new.document_kind = 'ambiguous'",
  "new.document_kind = 'listing' and v_detail_precision",
  "'provider_detail_listing'",
  "'ambiguous_property_result'",
  'least(v_base_boost, 0.05::real)',
  'd.display_eligibility is distinct from e.expected_eligibility',
  'd.display_eligibility_reason is distinct from e.expected_reason',
  'd.ranking_quality_boost is distinct from e.expected_boost',
  'create or replace function public.odm_ranking_quality_1_report_v1()',
  "'policy_drift_rows'",
  "'non_real_estate_or_unknown_public_rows'",
  "'category_public_rows'",
  "'ambiguous_primary_rows'",
  "'listing_with_ambiguous_policy_rows'",
  "'ranking_v2_changed', false",
  "'acquisition_changed', false",
  'service_role',
]) {
  assert.ok(lower.includes(token.toLowerCase()), `missing policy contract token: ${token}`);
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

const setterMatch = sql.match(/create or replace function public\.odm06_set_display_policy\(\)[\s\S]*?\n\$\$;/i);
assert.ok(setterMatch, 'composed ODM-06 setter body missing');
const setter = setterMatch[0].toLowerCase();
assert.ok(setter.indexOf("new.vertical_classification is distinct from 'real_estate_likely'") < setter.indexOf("new.document_kind = 'category'"), 'fail-closed vertical purity must precede document-kind overrides');
assert.ok(setter.indexOf("new.document_kind = 'category'") < setter.indexOf("new.document_kind = 'ambiguous'"), 'CATEGORY must be resolved before AMBIGUOUS');
assert.ok(setter.indexOf("new.document_kind = 'ambiguous'") < setter.indexOf("new.document_kind = 'listing' and v_detail_precision"), 'AMBIGUOUS cap must precede detail LISTING override');

const triggerMatch = dependencySql.match(/create trigger zzz_thin_index_display_policy_write[\s\S]*?execute function public\.odm06_set_display_policy\(\);/i);
assert.ok(triggerMatch, 'final composed display-policy trigger missing');
const trigger = triggerMatch[0].toLowerCase();
for (const watchedColumn of [
  'vertical_classification',
  'canonical_url',
  'source_domain',
  'seed_provider',
  'freshness_status',
  'title',
  'snippet',
  'normalized_city',
  'normalized_property_type',
  'normalized_intent',
  'normalized_price_mad',
  'normalized_surface_m2',
  'normalized_price_m2',
  'recovery_confidence',
  'normalization_status',
  'quality_tier',
  'quality_score',
  'document_kind',
  'document_kind_version',
]) {
  assert.ok(trigger.includes(watchedColumn), `final trigger must watch ${watchedColumn}`);
}

assert.ok(dependencyLower.includes('postgresql update of triggers fire from the original set target list'), 'indirect quality-trigger rationale must stay documented');
assert.ok(!/create\s+or\s+replace\s+function\s+public\.odm_ranking_v2_/i.test(sql + dependencySql), 'Ranking V2 scoring/search functions are out of scope');
assert.ok(!/update\s+public\.source_offer_seeds/i.test(sql + dependencySql), 'source acquisition is out of scope');
assert.ok(!/insert\s+into\s+public\.source_offer_seeds/i.test(sql + dependencySql), 'new source acquisition is out of scope');
assert.ok(!/grant\s+(select|insert|update|delete|execute).*\b(anon|authenticated)\b/i.test(sql + dependencySql), 'public roles must not receive privileges');
assert.ok(!/alter\s+table\s+public\.thin_index_search_documents/i.test(sql + dependencySql), 'schema redesign is out of scope');

console.log('RANKING-QUALITY-1 composed display policy contract PASS');
