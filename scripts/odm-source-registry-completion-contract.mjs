import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260729170000_odm_source_registry_completion_v1.sql','utf8');

for (const domain of [
  'soukimmobilier.com','sarouty.ma','barnes-marrakech.com','1immo.ma','kawtarimmobilier.com',
]) assert.ok(migration.includes(`'${domain}'`),`missing domain policy: ${domain}`);

for (const token of [
  'odm_source_registry_coverage_shadow_v1','odm_source_registry_coverage_report_v1',
  'zero_missing_domains','zero_ambiguous_domains','no_bypass_everywhere',
  'valid_display_policy_everywhere','full_representation_coverage',
  'missing_policy','ambiguous_policy_alias','invalid_no_bypass_policy','invalid_display_policy',
  'internal_signal_only','public_index_only','public_sitemap_only','permission_required',
]) assert.ok(migration.includes(token),`missing token: ${token}`);

for (const pattern of [
  /update\s+public\.thin_index_search_documents/i,
  /delete\s+from\s+public\.thin_index_search_documents/i,
  /insert\s+into\s+public\.thin_index_search_documents/i,
  /update\s+public\.property_listings/i,
  /insert\s+into\s+public\.property_listings/i,
  /delete\s+from\s+public\.property_listings/i,
  /display_eligibility\s*=/i,
  /ranking_quality_boost\s*=/i,
  /detail_fetch_policy[^\n]*'allowed_bounded'/i,
  /content_reuse_policy[^\n]*'authorized'/i,
  /display_policy[^\n]*'partner_content'/i,
]) assert.equal(pattern.test(migration),false,`forbidden activation: ${pattern}`);

const policies = [...migration.matchAll(/\('([^']+)',\s*'([^']+)',\s*\d+,\s*\n\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g)]
  .filter(([,domain])=>['soukimmobilier.com','sarouty.ma','barnes-marrakech.com','1immo.ma','kawtarimmobilier.com'].includes(domain));
assert.equal(policies.length,5,'expected five completed source policies');
for (const [,domain,,discovery,detail,reuse,display] of policies) {
  assert.ok(['public_index_only','public_sitemap_only'].includes(discovery),domain);
  assert.ok(['legal_review_required','permission_required'].includes(detail),domain);
  assert.ok(['unknown','permission_required','prohibited'].includes(reuse),domain);
  assert.equal(display,'internal_signal_only',domain);
}

assert.ok(migration.includes('no_bypass_required=true'));
assert.ok(migration.includes('revoke all on public.odm_source_registry_coverage_shadow_v1 from public,anon,authenticated'));
assert.ok(migration.includes('grant select on public.odm_source_registry_coverage_shadow_v1 to service_role'));
assert.ok(migration.includes('grant execute on function public.odm_source_registry_coverage_report_v1() to service_role'));

console.log('ODM-SOURCE-REGISTRY-COMPLETION-V1 contract OK');