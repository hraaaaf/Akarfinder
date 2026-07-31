import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260731162500_odm_document_kind_classification_v1.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

const required = [
  'document_kind',
  "'LISTING'",
  "'CATEGORY'",
  "'AMBIGUOUS'",
  'category_page_not_listing',
  'ambiguous_property_result',
  'refresh_odm_document_kind_classification_v1',
  'odm_document_kind_report_v1',
  'indexed_rows_deleted',
  'network_access',
  'service_role',
];

for (const token of required) {
  if (!sql.includes(token)) throw new Error(`Missing contract token: ${token}`);
}

const forbidden = [
  /delete\s+from\s+public\.thin_index_search_documents/i,
  /truncate\s+/i,
  /grant\s+execute[^;]+\b(anon|authenticated)\b/i,
  /display_eligibility\s*=\s*'eligible_primary'[^\n]+CATEGORY/i,
];

for (const pattern of forbidden) {
  if (pattern.test(sql)) throw new Error(`Forbidden pattern: ${pattern}`);
}

console.log('ODM Document Kind Classification V1 contract passed');
