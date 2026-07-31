import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260801004500_odm_mouldar_detail_precision_v1.sql', 'utf8');

const required = [
  "source_domain = 'mouldar.com'",
  "document_kind = 'AMBIGUOUS'",
  "document_kind = 'LISTING'",
  'mouldar_explicit_listing_detail_url',
  "^https://mouldar\\.com/(fr|en)/.+/[0-9a-f]{8}/?$",
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
  if (sql.toLowerCase().includes(token.toLowerCase())) throw new Error(`Forbidden contract token: ${token}`);
}

console.log('ODM Mouldar detail precision V1 contract passed');
