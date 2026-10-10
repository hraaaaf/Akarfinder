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

test('additional independent city observation joins by source ID, no invented freshness',()=>{
 const existing=card('a:111');
 const newCity={...card('a:9876543'),city:'Meknes',district:'Hamria'};
 const {report,rows}=consolidateCardObservations([mob('mubawab_50',[existing]),mob('mubawab_new_cities_30',[newCity])]);
 assert.equal(report.distinct_source_id_count,2);
 assert.equal(report.five_field_observed_consistent,2);
 assert.equal(report.commercially_available_verified_count,0);
 assert.ok(rows.every(r=>r.freshness_certified===false));
});

test('regional listing IDs remain independent from six/source ledger and never imply active sale',()=>{
 const regional={...card('a:8800011'),city:'Tétouan',district:'Wilaya'};
 const {report,rows}=consolidateCardObservations([mob('mubawab_regional_8',[regional]),mob('mubawab_50',[card('a:8800012')])]);
 assert.equal(report.distinct_source_id_count,2);
 assert.equal(report.five_field_observed_consistent,2);
 assert.equal(report.commercially_available_verified_count,0);
 assert.ok(rows.every(r=>r.active_sale_verified===false));
});

test('ninth source batch only adds independent IDs; overlapping evidence never promotes unverified offers',()=>{
 const existing={...card('a:8811022'),city:'Fès',district:'Centre Ville'};
 const novel={...card('a:8811033'),city:'Nador',district:'Centre Ville'};
 const {report,rows}=consolidateCardObservations([
  mob('mubawab_regional_8',[existing]),
  mob('mubawab_regional_40',[existing,novel])
 ]);
 assert.equal(report.raw_card_observations,3);
 assert.equal(report.distinct_source_id_count,2);
 assert.equal(report.five_field_observed_consistent,2);
 assert.equal(report.cross_run_conflict_rows,0);
 assert.equal(report.freshness_certified_count,0);
 assert.equal(report.commercially_available_verified_count,0);
 assert.equal(report.physically_unique_certified_count,0);
 assert.equal(report.database_writes,0);
 assert.deepEqual(rows.find(x=>x.identity==='a:8811022').observed_in,['mubawab_regional_40','mubawab_regional_8']);
});
