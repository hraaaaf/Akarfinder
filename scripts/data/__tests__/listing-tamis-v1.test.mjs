import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectListingForSnapshot,tamisReport} from '../listing-tamis-v1.mjs';
const mub=(patch={})=>({source:'mubawab.ma',identity:'a:111',canonical_url:'https://www.mubawab.ma/fr/a/111/appartement',
 city:'Casablanca',district:'Maârif',price_mad:1800000,surface_m2:95,
 five_field_observed_consistent:true,cross_run_conflicts:[],observed_in:['mubawab_50'],
 complete_card_evidence:[{artifact_key:'mubawab_50',card_sha256:'a'.repeat(64)}],
 potential_same_property_other_id:false,active_sale_verified:false, freshness_certified:false,cross_source_deduplicated:false,...patch});
const dom=(patch={})=>({...mub(),source:'domio.ma',identity:'domio:3001',canonical_url:'https://domio.ma/fr/appartement/louer/casablanca/3001/appartement',price_mad:9000,...patch});
test('a verified same-card candidate is snapshot-eligible but never commercially publishable',()=>{
 const t=inspectListingForSnapshot(mub());
 assert.equal(t.decision,'candidate_snapshot_pass');assert.match(t.card_snapshot_sha256,/^[0-9a-f]{64}$/);
 assert.equal(t.production_publishable,false);assert.equal(t.commercially_available_certified,false);
 assert.deepEqual(t.reasons,[]);
});
test('every route must bind claimed source ID to public detail URL, no userinfo or external host',()=>{
 for(const row of [mub({canonical_url:'https://www.mubawab.ma/fr/a/222/appartement'}),mub({canonical_url:'https://evil.example/fr/a/111/x'}),mub({canonical_url:'https://user@www.mubawab.ma/fr/a/111/x'}),dom({identity:'domio:999'})]){
  const t=inspectListingForSnapshot(row);assert.notEqual(t.decision,'candidate_snapshot_pass');
  assert.equal(t.card_snapshot_sha256,null);
 }
});
test('Domio route-aware rental price, sale price, apartment surface and city checks',()=>{
 assert.equal(inspectListingForSnapshot(dom()).decision,'candidate_snapshot_pass');
 assert.ok(inspectListingForSnapshot(dom({price_mad:350000})).reasons.includes('price_out_of_rental_range'));
 assert.ok(inspectListingForSnapshot(dom({canonical_url:'https://domio.ma/fr/appartement/vendre/casablanca/3001/flat',price_mad:1500})).reasons.includes('price_out_of_sale_range'));
 assert.ok(inspectListingForSnapshot(dom({surface_m2:4000})).reasons.includes('apartment_surface_out_of_range'));
 assert.ok(inspectListingForSnapshot(dom({city:'Rabat'})).reasons.includes('city_disagrees_with_detail_route'));
});
test('same-card provenance is mandatory: no Frankenstein composite from mixed rows',()=>{
 const x=mub({complete_card_evidence:[]});const t=inspectListingForSnapshot(x);
 assert.ok(t.reasons.includes('same_card_evidence_missing'));assert.equal(t.decision,'hold_parser_repair');
});
test('conflicts and suspected physical duplicates stay in distinct review lanes, never auto merge',()=>{
 const a=inspectListingForSnapshot(mub({price_mad:null,cross_run_conflicts:['price_mad'],five_field_observed_consistent:false}));
 assert.equal(a.decision,'hold_conflicting_sources');assert.equal(a.card_snapshot_sha256,null);
 const b=inspectListingForSnapshot(mub({potential_same_property_other_id:true}));
 assert.equal(b.decision,'hold_physical_review');assert.equal(b.physically_unique_certified,false);
});
test('stable fingerprints: identity, fields and observed evidence change signature',()=>{
 const a=inspectListingForSnapshot(mub()).card_snapshot_sha256;
 assert.equal(a,inspectListingForSnapshot(mub()).card_snapshot_sha256);
 assert.notEqual(a,inspectListingForSnapshot(mub({price_mad:1900000})).card_snapshot_sha256);
 assert.notEqual(a,inspectListingForSnapshot(mub({observed_in:['mubawab_frontier_100']})).card_snapshot_sha256);
});
test('all listings classified once, repair queue aggregated per source and reason',()=>{
 const {summary,passed,quarantine,inspected}=tamisReport([mub(),dom({price_mad:350000}),mub({identity:'a:112',canonical_url:'https://www.mubawab.ma/fr/a/112/other',potential_same_property_other_id:true})]);
 assert.equal(summary.source_ids_inspected,3);assert.equal(summary.candidate_snapshot_pass,1);
 assert.equal(summary.quarantined_for_repair_or_review,2);assert.equal(passed.length+quarantine.length,3);
 assert.equal(new Set(inspected.map(x=>x.source+'|'+x.identity)).size,3);
 assert.equal(summary.publishable_count,0);assert.equal(summary.database_writes,0);
 assert.ok(summary.repair_priorities.some(x=>x.cause==='potential_physical_duplicate_review'));
});


test('individual Domio source route beats misleading transaction wording in URL slug',()=>{
 const a=dom({identity:'domio:11371',canonical_url:'https://domio.ma/fr/appartement/vendre/rabat/11371/appartement-a-louer-a-lagdal',city:'Rabat',district:'Agdal',price_mad:3800000});
 const b=dom({identity:'domio:10396',canonical_url:'https://domio.ma/fr/appartement/louer/casablanca/10396/vente-appartement-meuble-a-casablanca-racine'});
 for(const row of [a,b]){
  const x=inspectListingForSnapshot(row);
  assert.equal(x.decision,'hold_parser_repair');assert.ok(x.reasons.includes('transaction_slug_disagrees_with_source_route'));
  assert.equal(x.card_snapshot_sha256,null);
 }
 assert.equal(inspectListingForSnapshot(dom()).decision,'candidate_snapshot_pass');
});
