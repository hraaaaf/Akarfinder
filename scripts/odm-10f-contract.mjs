import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260727180000_odm_10f_structured_signal_recovery.sql','utf8');
const fix = readFileSync('supabase/migrations/20260727180500_odm_10f_comparable_scope_fix.sql','utf8');
const joined = `${migration}\n${fix}`;

const required = [
  'stored_public_index_result',
  'odm_10f_price_candidates',
  'odm_10f_surface_candidates',
  'ambiguous_price_rejected',
  'ambiguous_surface_rejected',
  "ranking_rows_changed",
  "s.metadata ? 'serper_search'",
  'between 500 and 1000000000',
  'between 9 and 100000',
  'price_per_m2_mad',
  'normalized_price_m2',
];
for (const token of required) {
  if (!joined.includes(token)) throw new Error(`missing ODM-10F contract token: ${token}`);
}
const forbidden = ['fetch(', 'axios', 'playwright', 'puppeteer', 'captcha', 'stealth', 'normalized_price_mad=random', 'normalized_surface_m2=random'];
for (const token of forbidden) {
  if (joined.toLowerCase().includes(token.toLowerCase())) throw new Error(`forbidden ODM-10F token: ${token}`);
}
if (!joined.includes("raise exception 'ODM-10F changed ranking state")) throw new Error('ranking fail-closed guard missing');
console.log('ODM-10F contract assertions passed');
