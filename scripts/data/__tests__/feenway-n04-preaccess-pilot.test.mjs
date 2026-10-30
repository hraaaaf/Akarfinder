import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseJsonl,select} from '../../acquisition/feenway-n04-preaccess-pilot.mjs';
const rows=parseJsonl(readFileSync('docs/data/feenway-n03d-proof-gaps-81-2026-10-30.jsonl','utf8'));
test('real 81: 10 pilot cases + 6 sentinel controls; 0 external access',()=>{
 const p=select(rows),all=[...p.primary,...p.controls];
 assert.equal(p.population,81);assert.equal(p.primary.length,10);assert.equal(p.controls.length,6);
 assert.deepEqual(p.quotas,{'avito.ma':4,'mubawab.ma':3,'agenz.ma':2,'yakeey.com':1});
 assert.equal(new Set(all.map(x=>x.feenway_id)).size,16);
 assert.ok(all.every(x=>x.review_state==='blocked_pre_access'&&!x.eligible_for_db&&!x.publishable&&x.access_permission==='not_verified'&&x.reuse_rights==='not_verified'));
});
test('preserve three distinct economic failure-mode controls',()=>{
 const p=select(rows);
 assert.deepEqual(p.controls.filter(x=>x.role==='economic_control').map(x=>x.warning).sort(),['pas_de_porte_not_monthly_rent','price_is_daily_short_stay','price_is_per_square_meter']);
 assert.equal(p.controls.filter(x=>x.role==='unavailable_control').length,2);
 assert.equal(p.controls.filter(x=>x.role==='age_control_not_freshness_proof').length,1);
});
test('reject duplicate FeenWay identities and portal identities',()=>{
 assert.throws(()=>select([...rows.slice(0,80),rows[0]]),/invalid_feenway_identity/);
 assert.throws(()=>select([...rows.slice(0,80),{...rows[80],source_portal:rows[0].source_portal,source_identity:rows[0].source_identity}]),/invalid_original_identity/);
});
test('refuse any undocumented commercial gates',()=>{
 assert.throws(()=>select([{...rows[0],eligible_for_db:true},...rows.slice(1)]),/unsafe_eligibility_claim/);
 assert.throws(()=>select([{...rows[0],required_positive_evidence_missing:[]},...rows.slice(1)]),/incomplete_proof_gates/);
});
test('malformed or incomplete ledger fails closed',()=>{
 assert.throws(()=>select(rows.slice(1)),/expected_81_rows/);
 assert.throws(()=>parseJsonl('{"broken":}'),/bad_jsonl_1/);
});
