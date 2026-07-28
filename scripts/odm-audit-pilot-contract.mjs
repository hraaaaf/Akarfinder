import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20260728103000_odm_audit_pilot_validator_v1.sql',
  'utf8',
);

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
  'no_public_policy_bypass',
  'no_quality_d_admission',
  'no_ambiguous_structured_publication',
  'no_stale_structured_publication',
];

for (const token of required) {
  if (!migration.includes(token)) {
    throw new Error(`ODM audit pilot contract missing: ${token}`);
  }
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
  if (pattern.test(migration)) {
    throw new Error(`ODM audit pilot forbidden behavior: ${pattern}`);
  }
}

const fixtures = [
  ['1.650.000 DH', '1650000'],
  ['1 650 000 MAD', '1650000'],
  ['1,650,000 dh', '1650000'],
  ['650000 DH', '650000'],
];

const normalizePrice = (input) => input.replace(/[^0-9]/g, '');
for (const [input, expected] of fixtures) {
  if (normalizePrice(input) !== expected) {
    throw new Error(`separator fixture failed: ${input}`);
  }
}

console.log('ODM-AUDIT-PILOT-01 contract OK');
