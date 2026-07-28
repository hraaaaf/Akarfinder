import { readFileSync } from 'node:fs';

const files = [
  'supabase/migrations/20260728103000_odm_audit_pilot_validator_v1.sql',
  'supabase/migrations/20260728104500_odm_audit_shadow_field_suppression_v1.sql',
  'supabase/migrations/20260728105000_odm_audit_shadow_view_rebuild_v1.sql',
  'supabase/migrations/20260728110000_odm_audit_title_first_precedence_v1.sql',
];
const migration = files.map((file) => readFileSync(file, 'utf8')).join('\n');

const required = [
  'odm_audit_signal_validation_v1',
  'odm_audit_pilot_report_v1',
  'blocked_internal_signal_only',
  'blocked_missing_policy',
  'candidate_canonical_link',
  'archive_unconfirmed',
  'unconfirmed_timestamp',
  'persisted_price_conflict',
  'persisted_surface_conflict',
  'shadow_public_price_mad',
  'shadow_public_surface_m2',
  'title_price_candidates',
  'snippet_price_candidates',
  'title_surface_candidates',
  'snippet_surface_candidates',
  'snippet_price_history_conflict',
  'snippet_surface_history_conflict',
  'price_evidence_source',
  'surface_evidence_source',
  'title_price_wins_over_snippet',
  'title_surface_wins_over_snippet',
  'ambiguous_title_price_suppressed',
  'ambiguous_title_surface_suppressed',
  'no_public_policy_bypass',
  'no_quality_d_admission',
  'untrusted_price_suppressed',
  'untrusted_surface_suppressed',
];

for (const token of required) {
  if (!migration.includes(token)) throw new Error(`ODM audit pilot contract missing: ${token}`);
}

const forbidden = [
  /update\s+public\.thin_index_search_documents/i,
  /delete\s+from\s+public\.thin_index_search_documents/i,
  /insert\s+into\s+public\.thin_index_search_documents/i,
  /display_eligibility\s*=/i,
  /ranking_quality_boost\s*=/i,
  /fetch\s*\(/i,
  /axios/i,
  /playwright/i,
  /captcha/i,
  /proxy/i,
];
for (const pattern of forbidden) {
  if (pattern.test(migration)) throw new Error(`ODM audit pilot forbidden behavior: ${pattern}`);
}

const fixtures = [
  ['1.650.000 DH', '1650000'],
  ['1 650 000 MAD', '1650000'],
  ['1,650,000 dh', '1650000'],
  ['650000 DH', '650000'],
];
const normalizePrice = (input) => input.replace(/[^0-9]/g, '');
for (const [input, expected] of fixtures) {
  if (normalizePrice(input) !== expected) throw new Error(`separator fixture failed: ${input}`);
}

console.log('ODM-AUDIT-PILOT-01 title-first contract OK');
