import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260727190000_odm_10g_comparable_coverage_acquisition.sql','utf8');
const guard = readFileSync('supabase/migrations/20260727190500_odm_10g_future_signal_preservation.sql','utf8');
const required = [
  'persisted_discovery_candidate',
  'odm_10f_single_price',
  'odm_10f_single_surface',
  'ranking_rows_changed',
  "vertical_classification='real_estate_likely'",
  'public_index_result',
];
for (const token of required) {
  if (!(migration + guard).includes(token)) throw new Error(`ODM-10G contract missing ${token}`);
}
for (const forbidden of ['fetch(', 'axios', 'playwright', 'captcha', 'proxy', 'normalized_price_mad=new.']) {
  if ((migration + guard).includes(forbidden)) throw new Error(`ODM-10G forbidden behavior: ${forbidden}`);
}
if (!guard.includes('trg_odm_10g_preserve_discovery_signal')) throw new Error('future preservation trigger missing');
if (!guard.includes('odm_10g_comparable_gap_by_source')) throw new Error('coverage gap view missing');
console.log('ODM-10G contract OK');
