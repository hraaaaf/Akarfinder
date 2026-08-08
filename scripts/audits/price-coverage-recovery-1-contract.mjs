import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260808213000_price_coverage_recovery_governance_v1.sql';
const sql = readFileSync(migrationPath, 'utf8');

const materializerStart = sql.indexOf('create or replace function public.odm_materialize_price_coverage_recovery_v1()');
const materializerEnd = sql.indexOf('-- Reclassify an already-materialized V1 value', materializerStart);
assert.ok(materializerStart >= 0 && materializerEnd > materializerStart, 'materializer function must exist');
const materializer = sql.slice(materializerStart, materializerEnd);

assert.match(materializer, /insert into public\.odm_price_coverage_recovery_audit_v1/i,
  'V1 recovery must keep durable audit evidence');
assert.doesNotMatch(materializer, /update\s+public\.thin_index_search_documents/i,
  'V1 recovery must never materialize a shadow price into the public Thin Index field');
assert.match(materializer, /'updated_rows',0/i,
  'V1 recovery must explicitly report zero public row updates');
assert.match(materializer, /'shadow_only',true/i,
  'V1 recovery must declare shadow-only behavior');
assert.match(materializer, /'publication_activated',false/i,
  'V1 recovery must keep publication disabled');
assert.match(materializer, /'ranking_policy_changed',false/i,
  'V1 recovery must keep ranking unchanged');

assert.match(sql, /t\.trusted_value_count=1/i,
  'preservation requires one trusted Economic V2 value');
assert.match(sql, /t\.trusted_type_count=1/i,
  'preservation requires one trusted Economic V2 type');
assert.match(sql, /t\.trusted_value_mad=v\.normalized_price_mad/i,
  'preservation requires exact value equality');
assert.match(sql, /v\.normalized_intent='sale'.*sale_total.*discounted_price/is,
  'sale preservation must be intent-compatible');
assert.match(sql, /v\.normalized_intent='rent'.*rent_monthly.*rent_daily.*rent_weekly/is,
  'rent preservation must be intent-compatible');
assert.match(sql, /'price_governance','trusted_economic_v2_exact_match'/i,
  'trusted preservation must replace stale shadow provenance');

assert.match(sql, /set normalized_price_mad=null,/i,
  'untrusted shadow values must fail closed');
assert.match(sql, /price_per_m2_mad=null,/i,
  'derived price/m2 must fail closed with the shadow price');
assert.match(sql, /normalized_price_m2=null,/i,
  'normalized derived price/m2 must fail closed with the shadow price');
assert.match(sql, /'price_governance','shadow_v1_fail_closed'/i,
  'fail-closed cleanup must leave explicit governance provenance');

assert.doesNotMatch(sql, /ranking_quality_boost\s*=/i,
  'LOT must not change ranking boosts');
assert.doesNotMatch(sql, /ranking_policy_version\s*=/i,
  'LOT must not change ranking policy');
assert.doesNotMatch(sql, /update\s+public\.source_offer_seeds/i,
  'LOT must not trigger source acquisition or recrawl writes');

assert.match(sql, /shadow_recovery_audit_only',v1_materialized_rows=0/i,
  'report must gate on zero V1 shadow values remaining in public price fields');
assert.match(sql, /publication_remains_disabled',publication_enabled_rows=0/i,
  'report must gate on publication remaining disabled');
assert.match(sql, /ranking_policy_unchanged',ranking_enabled_rows=0/i,
  'report must gate on ranking remaining disabled');
assert.match(sql, /fail_closed_rows_have_no_public_price',fail_closed_price_leaks=0/i,
  'report must gate against fail-closed public price leaks');

console.log('PRICE-COVERAGE-RECOVERY-1 contract PASS');
