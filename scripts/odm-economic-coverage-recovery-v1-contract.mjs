import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql=fs.readFileSync('supabase/migrations/20260730090000_odm_economic_coverage_recovery_v1.sql','utf8');
for (const token of [
  'odm_economic_recovery_candidate_shadow_v1',
  'refresh_odm_economic_coverage_recovery_v1',
  'odm_economic_coverage_recovery_report_v1',
  "recovery_status in ('eligible_shadow','blocked_ambiguous','blocked_rejected','blocked_stale','blocked_missing_proof','blocked_intent')",
  'all_rows_provenanced',
  'only_missing_v2_can_be_eligible',
  'no_ambiguous_or_rejected_recovery',
  'publication_remains_disabled',
  'ranking_remains_disabled',
  'enable row level security',
  'to service_role'
]) assert.ok(sql.includes(token),`missing ${token}`);
for (const forbidden of [
  'update public.property_listings',
  'update public.thin_index_search_documents',
  'insert into public.property_listings',
  'publication_eligible=true',
  'ranking_eligible=true'
]) assert.ok(!sql.toLowerCase().includes(forbidden),`forbidden ${forbidden}`);
console.log('ODM economic coverage recovery V1 contract passed');