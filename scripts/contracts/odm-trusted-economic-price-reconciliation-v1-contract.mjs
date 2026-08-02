import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260802153000_odm_trusted_economic_price_reconciliation_v1.sql';
const sql = fs.readFileSync(path, 'utf8');

for (const token of [
  'odm_trusted_price_reconciliation_audit_v1',
  'odm_trusted_price_reconciliation_report_v1',
  'odm_apply_trusted_price_reconciliation_v1',
  "economic_status='trusted'",
  "replace_with_trusted",
  "suppress_untrusted",
  'normalized_price_mad=null',
  'normalized_price_m2=null',
  'trusted_mismatches_zero',
  'ambiguous_with_price_zero',
  'untrusted_with_price_zero',
  'price_per_m2_consistent',
  'revoke all on function public.odm_apply_trusted_price_reconciliation_v1()',
]) {
  assert.ok(sql.includes(token), `missing contract token: ${token}`);
}

assert.ok(!sql.includes('grant execute on function public.odm_apply_trusted_price_reconciliation_v1() to anon'));
assert.ok(!sql.includes('grant execute on function public.odm_apply_trusted_price_reconciliation_v1() to authenticated'));
console.log('ODM trusted economic price reconciliation V1 contract: OK');
