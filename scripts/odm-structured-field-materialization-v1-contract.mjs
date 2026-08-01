import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260801160000_odm_structured_field_materialization_v1.sql';
const sql = fs.readFileSync(path, 'utf8');

for (const token of [
  'odm_structured_field_materialization_audit_v1',
  'odm_materialize_structured_fields_v1',
  'odm_structured_field_materialization_report_v1',
  "property_type_status = 'recovered'",
  "intent_status = 'recovered'",
  'normalized_property_type is null',
  'normalized_intent is null',
  'publication_eligible boolean not null default false',
  'ranking_activated boolean not null default false',
  'enable row level security',
  'revoke all',
  'service_role',
]) assert.ok(sql.toLowerCase().includes(token.toLowerCase()), `missing ${token}`);

assert.ok(!/grant\s+(select|insert|update|delete|execute).*\b(anon|authenticated)\b/i.test(sql), 'public roles must not receive access');
assert.ok(!/set\s+display_eligibility/i.test(sql), 'display eligibility must not change');
assert.ok(!/set\s+ranking_quality_boost/i.test(sql), 'ranking policy must not change');

console.log('ODM structured field materialization V1 contract passed');
