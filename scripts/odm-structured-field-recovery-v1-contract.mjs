import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql=fs.readFileSync('supabase/migrations/20260801153500_odm_structured_field_recovery_v1.sql','utf8').toLowerCase();
for (const token of [
  'odm_structured_field_recovery_shadow_v1',
  'odm_structured_field_recovery_report_v1',
  'recovered_single',
  'ambiguous',
  'no_existing_type_overwritten',
  'no_existing_intent_overwritten',
  'no_ambiguous_type_recovered',
  'no_ambiguous_intent_recovered',
  'publication_remains_disabled',
  'ranking_remains_disabled',
  'enable row level security',
  'security invoker',
  'to service_role'
]) assert.ok(sql.includes(token),`missing ${token}`);
for (const forbidden of [
  'publication_eligible = true',
  'ranking_eligible = true',
  'security definer',
  'grant select on public.odm_structured_field_recovery_shadow_v1 to anon',
  'grant select on public.odm_structured_field_recovery_shadow_v1 to authenticated',
  'update public.thin_index_search_documents'
]) assert.ok(!sql.includes(forbidden),`forbidden ${forbidden}`);
assert.ok(sql.includes("cardinality(c.type_matches)=1"),'type recovery must require one match');
assert.ok(sql.includes("cardinality(c.intent_matches)=1"),'intent recovery must require one match');
console.log('ODM Structured Field Recovery V1 contract passed');
