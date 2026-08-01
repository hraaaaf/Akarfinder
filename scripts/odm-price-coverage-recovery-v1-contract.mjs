import fs from 'node:fs';
import assert from 'node:assert/strict';
const sql=fs.readFileSync('supabase/migrations/20260801210000_odm_price_coverage_recovery_v1.sql','utf8').toLowerCase();
for(const token of ['odm_price_coverage_recovery_audit_v1','odm_materialize_price_coverage_recovery_v1','count(*) = 1','normalized_price_mad is null','normalized_intent in (\'sale\',\'rent\')','enable row level security','publication_eligible boolean not null default false','ranking_activated boolean not null default false','service_role']) assert.ok(sql.includes(token),`missing ${token}`);
assert.ok(!/grant\s+(select|insert|update|delete|execute).*\b(anon|authenticated)\b/i.test(sql),'public roles must not receive access');
assert.ok(!/set\s+(display_eligibility|ranking_quality_boost)/i.test(sql),'search policy must not change');
console.log('ODM price coverage recovery V1 contract passed');
