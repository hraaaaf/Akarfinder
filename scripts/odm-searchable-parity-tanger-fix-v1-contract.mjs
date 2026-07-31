import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync('supabase/migrations/20260731155500_odm_searchable_parity_tanger_fix_v1.sql','utf8');
assert.ok(sql.includes("('Tanger', 'villa', 'sale')"));
assert.ok(!sql.includes("('Tangier', 'villa', 'sale')"));
assert.ok(sql.includes('filter_mismatch_rows'));
assert.ok(!/update\s+public\.thin_index_search_documents/i.test(sql));
console.log('ODM Searchable Parity Tanger Fix V1 contract passed');
