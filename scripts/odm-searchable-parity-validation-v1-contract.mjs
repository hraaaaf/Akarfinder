import fs from 'node:fs';
import assert from 'node:assert/strict';

const sqlPath = 'supabase/migrations/20260731154500_odm_searchable_parity_validation_v1.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

for (const token of [
  'odm_searchable_parity_matrix_v1',
  'odm_searchable_parity_casablanca_rent_v1',
  'search_thin_index_v3',
  'filter_mismatch_rows',
  'exact_overlap',
  'logic_immo_odm_rows',
  'mubawab_category_like_rows',
  'service_role',
]) {
  assert.ok(sql.includes(token), `missing contract token: ${token}`);
}

for (const forbidden of [
  'update public.thin_index_search_documents',
  'insert into public.thin_index_search_documents',
  'delete from public.thin_index_search_documents',
  'public_activation = true',
  'ranking_public',
]) {
  assert.ok(!sql.toLowerCase().includes(forbidden), `forbidden mutation/activation: ${forbidden}`);
}

assert.match(sql, /revoke all on public\.odm_searchable_parity_matrix_v1 from public, anon, authenticated/i);
assert.match(sql, /grant select on public\.odm_searchable_parity_matrix_v1 to service_role/i);

console.log('ODM Searchable Parity Validation V1 contract passed');
