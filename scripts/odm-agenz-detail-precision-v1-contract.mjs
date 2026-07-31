import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260731234000_odm_agenz_detail_precision_v1.sql', 'utf8');

const required = [
  "source_domain = 'agenz.ma'",
  "document_kind = 'AMBIGUOUS'",
  "document_kind = 'LISTING'",
  "agenz_explicit_listing_detail_url",
  "^https://agenz\\.ma/(fr|en)/annonces/.+/[0-9]+/?$",
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
  /set\s+[\s\S]{0,400}display_eligibility\s*=\s*'eligible_primary'/i,
];

for (const token of forbidden) {
  const found = token instanceof RegExp ? token.test(sql) : sql.includes(token);
  if (found) throw new Error(`Forbidden contract token: ${token}`);
}

console.log('ODM Agenz detail precision V1 contract passed');
