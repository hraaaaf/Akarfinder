import fs from 'node:fs';

const path = 'supabase/migrations/20260802142000_canonical_link_coverage_expansion_v2.sql';
const sql = fs.readFileSync(path, 'utf8');
const required = [
  "seed_provider='public_sitemap'",
  "resolved_display_policy='canonical_link_only'",
  "freshness_status_v2 in ('fresh','aging')",
  "displayable_degraded",
  "null::text as title",
  "null::text as snippet",
  "null::numeric(14,2) as normalized_price_mad",
  "null::numeric(10,2) as normalized_surface_m2",
  "ranking_policy_version",
  "shadow_only",
  "public_activation",
  "revoke all on public.odm_search_read_model_shadow_v3 from anon,authenticated",
  "grant select on public.odm_search_read_model_shadow_v3 to service_role",
  "ranking_formula_unchanged",
  "no_content_copied",
  "no_detail_fields_copied"
];
for (const token of required) {
  if (!sql.includes(token)) throw new Error(`Missing contract token: ${token}`);
}
if (/grant\s+select\s+on\s+public\.odm_search_read_model_shadow_v3\s+to\s+(anon|authenticated)/i.test(sql)) {
  throw new Error('Public role access detected');
}
console.log('ODM Canonical Link Coverage Expansion V2 contract: OK');
