import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260802123000_odm_displayable_coverage_recovery_v1.sql','utf8');
const required = [
  'odm_displayable_coverage_recovery_shadow_v1',
  'canonical_link_only',
  'public_sitemap',
  'displayable_degraded',
  'odm_search_read_model_shadow_v2',
  'publication_remains_disabled',
  'public_activation_disabled',
  'service_role',
  'Ranking V2 formula changed'
];
for (const token of required) {
  if (!sql.includes(token)) throw new Error(`missing contract token: ${token}`);
}
if (sql.includes("resolved_display_policy = 'internal_signal_only' then 'recoverable'")) {
  throw new Error('internal_signal_only must never be recovered');
}
if (!sql.includes("resolved_display_policy <> 'canonical_link_only' then 'blocked'")) {
  throw new Error('canonical-link-only fail-closed gate missing');
}
console.log('ODM Displayable Coverage Recovery V1 contract: PASS');
