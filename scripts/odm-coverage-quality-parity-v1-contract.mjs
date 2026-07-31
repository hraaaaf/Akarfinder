import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync('supabase/migrations/20260731141500_odm_coverage_quality_parity_v1.sql','utf8').toLowerCase();
for (const token of [
  'refresh_odm_coverage_quality_parity_v1',
  'persisted_property_listing_with_structured_real_estate_dimensions',
  'odm_10d_recompute_quality',
  'thresholds_unchanged',
  'shadow_only',
  'public_activation',
  'to service_role'
]) assert.ok(sql.includes(token), `missing ${token}`);
for (const forbidden of [
  'security definer',
  'public_activation = true',
  'publication_eligible=true',
  'ranking_eligible=true',
  'http://',
  'https://'
]) assert.ok(!sql.includes(forbidden), `forbidden ${forbidden}`);
assert.ok(sql.includes("coalesce(d.vertical_classification, '') <> 'non_real_estate'"));
assert.ok(sql.includes("s.source_domain in ('mubawab.ma','mouldar.com','marrakechrealty.com')"));
console.log('ODM Coverage Quality Parity V1 contract passed');
