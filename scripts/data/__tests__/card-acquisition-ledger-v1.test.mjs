import test from 'node:test';
import assert from 'node:assert/strict';
import { consolidateCardObservations } from '../card-acquisition-ledger-v1.mjs';
const card=(identity,overrides={})=>({identity,canonical_url:'https://www.mubawab.ma/fr/a/'+identity.split(':')[1]+'/appart',city:'Casablanca',district:'Maârif',price_mad:1800000,surface_m2:95,five_field_observed:true,freshness_certified:false,...overrides});
const mob=(key,rows)=>({key,source:'mubawab.ma',rows});
const dom=(rows)=>({key:'domio_linked_70',source:'domio.ma',rows});
test('cross-run repeated identity counts once, keeps provenance, no publication',()=>{
 const {report,rows}=consolidateCardObservations([mob('mubawab_50',[card('a:111')]),mob('mubawab_frontier_100',[card('a:111')])]);
 assert.equal(report.distinct_source_id_count,1);assert.equal(report.five_field_observed_consistent,1);
 assert.deepEqual(rows[0].observed_in,['mubawab_50','mubawab_frontier_100']);
 assert.equal(rows[0].freshness_certified,false);assert.equal(report.database_writes,0);
});
test('different price in two legitimate cards quarantines the entire ID',()=>{
 const {report,rows}=consolidateCardObservations([mob('mubawab_50',[card('a:111')]),mob('mubawab_frontier_100',[card('a:111',{price_mad:1900000})])]);
 assert.equal(report.cross_run_conflict_rows,1);assert.equal(report.five_field_observed_consistent,0);
 assert.equal(rows[0].price_mad,null);assert.deepEqual(rows[0].cross_run_conflicts,['price_mad']);
});
test('cannot compose four fields from different incomplete cards',()=>{
 const {report}=consolidateCardObservations([mob('mubawab_50',[card('a:111',{district:null,five_field_observed:false})]),mob('mubawab_frontier_100',[card('a:111',{price_mad:null,five_field_observed:false})])]);
 assert.equal(report.five_field_observed_consistent,0);
});
test('Domio identity is separate from Mubawab; same signature flagged not merged',()=>{
 const other={identity:'domio:12',url:'https://domio.ma/fr/appartement/vendre/casablanca/12/appartement',city:'Casablanca',district:'Maârif',price_mad:1800000,surface_m2:95,five_field_present:true};
 const {report,rows}=consolidateCardObservations([mob('mubawab_50',[card('a:111')]),dom([other])]);
 assert.equal(report.distinct_source_id_count,2);assert.equal(report.suspected_same_property_signature_groups,1);
 assert.equal(report.candidate_cross_source_signature_groups,1);
 assert.equal(rows.filter(x=>x.potential_same_property_other_id).length,2);
 assert.equal(report.physically_unique_certified_count,0);
});
test('rejects out-of-domain and falsely certified input',()=>{
 const {report}=consolidateCardObservations([mob('mubawab_50',[card('a:111',{canonical_url:'https://evil.example/fr/a/111/appart'}),card('a:222',{freshness_certified:true})])]);
 assert.equal(report.rejected_untrusted_or_promoted_input_rows,2);assert.equal(report.distinct_source_id_count,0);
});
test('cross-run accents normalize to same neighborhood, not a conflict',()=>{
 const {report}=consolidateCardObservations([mob('mubawab_50',[card('a:111',{district:'Maârif'})]),mob('mubawab_frontier_100',[card('a:111',{district:'Maarif'})])]);
 assert.equal(report.cross_run_conflict_rows,0);assert.equal(report.five_field_observed_consistent,1);
});
