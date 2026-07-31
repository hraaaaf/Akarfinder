import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260801002500_odm_masaken_detail_precision_v1.sql', 'utf8');

const required = [
  "source_domain = 'masaken.ma'",
  "document_kind = 'AMBIGUOUS'",
  "document_kind = 'LISTING'",
  "masaken_explicit_listing_detail_url",
  "^https://masaken\\.ma/fr/immobilier-maroc/(vente|location)-[a-z0-9-]+/[0-9]+/?$",
  "then 'sale'",
  "then 'rent'",
  "then 'apartment'",
  "then 'land'",
  "then 'house'",
  'normalized_city is not null',
  'normalized_property_type is not null',
  'normalized_intent is not null',
  'revoke all on function',
  'grant execute on function',
  "'network_access', false",
  "'deleted_rows', 0",
];

for (const token of required) {
  if (!sql.includes(token)) throw new Error(`Missing contract token: ${token}`);
}

const forbidden = [
  'http_get(',
  'net.http_',
  'delete from public.thin_index_search_documents',
  "set display_eligibility = 'eligible_primary'",
];
for (const token of forbidden) {
  if (sql.includes(token)) throw new Error(`Forbidden contract token: ${token}`);
}

console.log('ODM Masaken detail precision V1 contract passed');
