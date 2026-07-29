import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260729163000_odm_freshness_score_v1.sql','utf8');

for (const token of [
  'odm_audit_freshness_score_v1','odm_audit_freshness_score_shadow_v1',
  'odm_audit_freshness_score_report_v1','freshness_score_v1','freshness_class',
  'invalid_future_timestamp','unconfirmed_timestamp','archive_unconfirmed',
  'ranking_eligible','publication_eligible','all_scores_bounded',
  'missing_timestamp_scores_zero','future_timestamp_scores_zero',
  'archive_unconfirmed_capped_at_ten','no_ranking_activation','no_publication_activation',
]) assert.ok(migration.includes(token),`missing token: ${token}`);

for (const pattern of [
  /update\s+public\.thin_index_search_documents/i,
  /insert\s+into\s+public\.thin_index_search_documents/i,
  /delete\s+from\s+public\.thin_index_search_documents/i,
  /update\s+public\.property_listings/i,
  /insert\s+into\s+public\.property_listings/i,
  /delete\s+from\s+public\.property_listings/i,
  /ranking_eligible'\s*,\s*true/i,
  /publication_eligible'\s*,\s*true/i,
  /display_eligibility\s*=/i,
]) assert.equal(pattern.test(migration),false,`forbidden mutation: ${pattern}`);

function score({ageDays,expectedDays,archive=false,confirmed=true,timestamp=true,future=false}) {
  if (!timestamp) return {score:0,klass:'unconfirmed_timestamp'};
  if (future) return {score:0,klass:'invalid_future_timestamp'};
  if (archive&&!confirmed) return {score:10,klass:'archive_unconfirmed'};
  if (ageDays<=expectedDays) return {score:Math.max(70,100-(Math.max(ageDays,0)/expectedDays)*30),klass:'fresh'};
  if (ageDays<=expectedDays*2) return {score:Math.max(30,70-((ageDays-expectedDays)/expectedDays)*40),klass:'aging'};
  return {score:Math.max(0,30-Math.min(30,((ageDays-(expectedDays*2))/expectedDays)*30)),klass:'stale'};
}

const direct=[0,3,7,10,14,21].map(age=>score({ageDays:age,expectedDays:7}));
for (let i=1;i<direct.length;i++) assert.ok(direct[i].score<=direct[i-1].score,'score must be monotonic');
assert.equal(score({ageDays:0,expectedDays:7}).score,100);
assert.equal(score({ageDays:7,expectedDays:7}).score,70);
assert.equal(score({ageDays:14,expectedDays:7}).score,30);
assert.equal(score({ageDays:21,expectedDays:7}).score,0);
assert.equal(score({ageDays:1,expectedDays:45,archive:true,confirmed:false}).score,10);
assert.equal(score({ageDays:0,expectedDays:21,timestamp:false}).score,0);
assert.equal(score({ageDays:0,expectedDays:21,future:true}).score,0);

for (const expectedDays of [7,21,30,45]) {
  for (const ageDays of [0,expectedDays/2,expectedDays,expectedDays*1.5,expectedDays*2,expectedDays*3]) {
    const result=score({ageDays,expectedDays});
    assert.ok(result.score>=0&&result.score<=100,`${expectedDays}/${ageDays}`);
  }
}

assert.ok(migration.includes("cadence_direct_or_partner_feed_7d"));
assert.ok(migration.includes("cadence_public_index_21d"));
assert.ok(migration.includes("cadence_archive_45d"));
assert.ok(migration.includes("cadence_default_30d"));
assert.ok(migration.includes("revoke all on public.odm_audit_freshness_score_shadow_v1 from public,anon,authenticated"));
assert.ok(migration.includes("grant select on public.odm_audit_freshness_score_shadow_v1 to service_role"));

console.log('ODM-FRESHNESS-SCORE-V1 contract OK');