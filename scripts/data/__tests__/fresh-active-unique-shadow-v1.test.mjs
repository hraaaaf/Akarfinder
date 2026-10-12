import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateListing,sampleCandidates,shadowReport} from '../fresh-active-unique-shadow-v1.mjs';
const row=(source='mubawab.ma',id='a:1')=>({source,identity:id,canonical_url:'https://www.mubawab.ma/fr/a/1/x',city:'Casablanca',five_field_observed_consistent:true,cross_run_conflicts:[],potential_same_property_other_id:false});
const proof=()=>({detail:{identity:'a:1',primary_verified:true,price_matches:true,surface_matches:true,date_ref:'source-date-evidence',published_at:'2026-10-08'},availability:{identity:'a:1',status:'available',issuer_role:'owner',issuer_verified:true,evidence_ref:'verified-seller-evidence',confirmed_at:'2026-10-09'},physical:{identity:'a:1',unique_reviewed:true,human_reviewed:true,comparison_ref:'physical-compare-v1',decision_ref:'human-decision-v1',reviewed_at:'2026-10-09'},rights:{identity:'a:1',authorized:true,rightsholder_verified:true,permission_ref:'owner-rights-v1'}});
test('recent date and HTTP200 alone fail seller and publication rights gates',()=>{const x=evaluateListing(row(),{detail:{http_status:200,published_at:'2026-10-08'}});assert.equal(x.ready_for_publication,false);assert.ok(x.blockers.includes('seller_confirmed_active'));});
test('all independent evidence gates required',()=>{assert.equal(evaluateListing(row(),proof()).ready_for_publication,true);for(const k of ['detail','availability','physical','rights']){const p=proof();p[k]={};assert.equal(evaluateListing(row(),p).ready_for_publication,false);}});
test('future published date, old seller confirmation, card conflict fail closed',()=>{const p=proof();p.detail.published_at='2026-10-11';assert.equal(evaluateListing(row(),p).checks.recent_publication,false);p.detail.published_at='2026-10-08';p.availability.confirmed_at='2026-08-09';assert.equal(evaluateListing(row(),p).checks.seller_confirmed_active,false);assert.equal(evaluateListing({...row(),cross_run_conflicts:['price_mad']},proof()).ready_for_publication,false);});
test('deterministic sample, two sources, no auto merge',()=>{const rs=[...Array.from({length:32},(_,i)=>({...row(),identity:'a:'+(i+5),potential_same_property_other_id:i===0})),...Array.from({length:32},(_,i)=>row('domio.ma','domio:'+(i+5)))];const a=sampleCandidates(rs);assert.deepEqual(a,sampleCandidates(rs));assert.equal(a.length,60);assert.ok(a.some(x=>x.suspected_duplicate));const {report}=shadowReport(rs);assert.equal(report.publishable_count,0);assert.equal(report.database_writes,0);});

test('stratified source samples reserve 20 baseline controls plus 10 suspect reviews per portal',()=>{
 const rs=[...Array.from({length:100},(_,i)=>({...row(),identity:'a:'+(i+10),potential_same_property_other_id:i<50})),
 ...Array.from({length:100},(_,i)=>({...row('domio.ma','domio:'+(i+100)),potential_same_property_other_id:i<50}))];
 const rows=sampleCandidates(rs);
 assert.equal(rows.length,60);assert.equal(rows.filter(x=>x.sampling_stratum==='risk_enriched').length,20);
 assert.equal(rows.filter(x=>x.sampling_stratum==='baseline_control').length,40);
 for(const source of ['mubawab.ma','domio.ma']){
  assert.equal(rows.filter(x=>x.source===source&&x.suspected_duplicate).length,10);
  assert.equal(rows.filter(x=>x.source===source&&!x.suspected_duplicate).length,20);
 }
 const {report}=shadowReport(rs);
 assert.equal(report.risk_enriched_sample_count,20);
 assert.equal(report.baseline_control_sample_count,40);
});
test('physical comparison and reuse permission must explicitly belong to the exact listing',()=>{
 const p=proof();p.physical.identity='a:999';assert.equal(evaluateListing(row(),p).checks.physical_unique_reviewed,false);
 p.physical.identity='a:1';p.rights.identity='a:999';assert.equal(evaluateListing(row(),p).checks.reuse_rights_approved,false);
 p.rights.identity='a:1';p.rights.rightsholder_verified=false;assert.equal(evaluateListing(row(),p).checks.reuse_rights_approved,false);
});
