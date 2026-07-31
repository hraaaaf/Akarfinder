import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync(
  'supabase/migrations/20260731130000_odm_coverage_parity_v1.sql',
  'utf8',
).toLowerCase();

for (const token of [
  'refresh_odm_legacy_coverage_bridge_v1',
  'odm_coverage_parity_report_v1',
  "origin_type = 'persisted_openserp'",
  "in ('mubawab.ma', 'mouldar.com', 'marrakechrealty.com')",
  "'fresh_confirmed'",
  "'shadow_only', true",
  "'public_activation', false",
  'security invoker',
  'to service_role',
  'on conflict (canonical_url) do update',
]) assert.ok(sql.includes(token), `missing ${token}`);

for (const forbidden of [
  'http_get(',
  'net.http',
  'captcha',
  'proxy',
  'stealth',
  'fake googlebot',
  "'logic-immo.com'",
  'publication_eligible=true',
  'ranking_eligible=true',
  'security definer',
]) assert.ok(!sql.includes(forbidden), `forbidden ${forbidden}`);

assert.ok(sql.includes("now() - interval '60 days'"), 'freshness must be bounded');
assert.ok(sql.includes("ls.is_active is true"), 'inactive evidence must stay excluded');
assert.ok(sql.includes('public.odm04_normalize_city'), 'city must be canonicalizable');
assert.ok(sql.includes('public.odm04_normalize_property_type'), 'type must be canonicalizable');
assert.ok(sql.includes('public.odm04_normalize_intent'), 'intent must be canonicalizable');
console.log('ODM Coverage Parity V1 contract passed');
