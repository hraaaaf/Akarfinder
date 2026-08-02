import fs from 'node:fs';

const path = 'supabase/migrations/20260802131500_authorized_source_depth_recovery_v1.sql';
const sql = fs.readFileSync(path, 'utf8');
const required = [
  'odm_authorized_source_depth_recovery_shadow_v1',
  'odm_authorized_source_depth_recovery_report_v1',
  "resolved_display_policy in ('canonical_link_only','partner_content','full_display')",
  "economic_status <> 'trusted'",
  'blocked_intent_missing',
  'blocked_intent_mismatch',
  'blocked_value_bounds',
  'public_sitemap_provider_missing',
  'publication_remains_disabled',
  'ranking_remains_disabled',
  'public_activation_disabled',
  'revoke all',
  'service_role'
];
for (const token of required) {
  if (!sql.includes(token)) throw new Error(`Missing contract token: ${token}`);
}
if (/update\s+public\.thin_index|insert\s+into\s+public\.thin_index/i.test(sql)) {
  throw new Error('Thin Index mutation is forbidden in this audit LOT');
}
console.log('Authorized Source Depth Recovery V1 contract: PASS');
