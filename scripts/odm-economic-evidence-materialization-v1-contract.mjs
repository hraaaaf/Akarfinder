import fs from 'node:fs';
import assert from 'node:assert/strict';

const path='supabase/migrations/20260730003000_odm_economic_evidence_materialization_v1.sql';
const sql=fs.readFileSync(path,'utf8');
for (const token of [
  'odm_economic_candidate_evidence_shadow_v1',
  'odm_economic_observation_state_shadow_v1',
  'refresh_odm_economic_evidence_materialization_v1',
  'odm_economic_evidence_materialization_report_v1',
  "economic_status in ('trusted','ambiguous','rejected','missing','stale','policy_blocked')",
  'full_observation_coverage',
  'maximum_one_principal_candidate',
  'all_candidate_evidence_provenanced',
  'publication_remains_disabled',
  'ranking_remains_disabled',
  "parser_version='odm_economic_parser_v2'",
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
console.log('ODM economic evidence materialization V1 contract passed');
