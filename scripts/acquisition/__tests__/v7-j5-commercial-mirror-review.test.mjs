import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewJ5CommercialCopies, J5CommercialReviewRejected}
  from '../v7_parallel/j5_commercial_mirror_review.mjs';

const URLS={
  '1007a':'https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/77532',
  '1007m':'https://www.mubawab.ma/fr/a/8422456/appartement-%C3%A0-vendre-106-m%C2%B2-3-chambres-al-qods-sal%C3%A9',
  '1009a':'https://agenz.ma/fr/annonces/immo-sale/vente-appartements/al-qods/175885',
  '1009m':'https://www.mubawab.ma/fr/a/8429897/appartement-%C3%A0-vendre-143-m%C2%B2-2-chambres-al-qods-sal%C3%A9',
};
const obs=(source_domain,source_offer_id,source_url,commercial_reference,
  price_mad,surface_m2,bedrooms,details={})=>({
    source_domain, source_offer_id, source_url, commercial_reference,
    observation_kind:'public_rendered_detail_unattested',
    price_mad,surface_m2,bedrooms,city:'Salé',district:'Al Qods',
    description_surface_m2:null,detail_floor:null,description_floor:null,...details,
});
const OFFER_1007=[
 obs('agenz.ma','77532',URLS['1007a'],'SAL-TA-1007',1350000,106,3,
   {description_surface_m2:106,detail_floor:2,description_floor:2}),
 obs('mubawab.ma','8422456',URLS['1007m'],'SAL-TA-1007',1350000,106,3,
   {description_surface_m2:106,detail_floor:2,description_floor:2})
];
const OFFER_1009=[
 obs('agenz.ma','175885',URLS['1009a'],'SAL-TA-1009',1595000,143,2,
   {description_surface_m2:145,detail_floor:5,description_floor:4}),
 obs('mubawab.ma','8429897',URLS['1009m'],'SAL-TA-1009',1595000,143,2,
   {description_surface_m2:145,detail_floor:5,description_floor:4})
];

test('two observed commercial references pair across portals, but never physical properties',()=>{
  const r=reviewJ5CommercialCopies([...OFFER_1009,...OFFER_1007]);
  assert.equal(r.possible_commercial_mirror_pairs,2);
  assert.equal(r.observations,4);
  assert.equal(r.commercial_references,2);
  assert.deepEqual(r.comparisons.map(c=>c.commercial_reference),
    ['SAL-TA-1007','SAL-TA-1009']);
  assert.ok(r.comparisons.every(c=>c.status==='two_portal_commercial_offer_match_review_only'));
  assert.ok(r.comparisons.every(c=>!c.same_physical_property_verified &&
    !c.original_html_of_both_sites_verified &&
    !c.eligible_for_private_detail_staging && !c.eligible_for_public_admission));
  assert.deepEqual([r.source_http_requests,r.db_writes],[0,0]);
  assert.equal(r.public_admission,false);
});

test('real #1009 story 145m2 and 4th floor versus 143m2 and 5th floor are not normalized away',()=>{
  const r=reviewJ5CommercialCopies(OFFER_1009);
  assert.equal(r.possible_commercial_mirror_pairs,1);
  for(const o of r.comparisons[0].observations) {
    assert.equal(o.claimed_surface_m2,143);
    assert.deepEqual(o.intra_page_contradictions,['surface_m2','floor']);
  }
  assert.equal(r.comparisons[0].independent_geography_verified,false);
});

test('same commercial reference with conflicting price means manual review, no match',()=>{
  const changed={...OFFER_1007[1], price_mad:1350001};
  const r=reviewJ5CommercialCopies([OFFER_1007[0],changed]);
  assert.equal(r.possible_commercial_mirror_pairs,0);
  assert.equal(r.comparisons[0].status,
    'commercial_reference_collision_or_value_drift_review');
});

test('different references with identical values are not merged',()=>{
  const changed={...OFFER_1007[1],commercial_reference:'SAL-TA-1999'};
  const r=reviewJ5CommercialCopies([OFFER_1007[0],changed]);
  assert.equal(r.possible_commercial_mirror_pairs,0);
  assert.equal(r.comparisons.length,2);
  assert.ok(r.comparisons.every(c=>c.status==='single_portal_unpaired'));
});

test('two Agenz records with the same reference cannot stand in for two portals',()=>{
  const other={...OFFER_1009[0],source_offer_id:'175886',
    source_url:URLS['1009a'].replace('175885','175886')};
  const r=reviewJ5CommercialCopies([OFFER_1009[0],other]);
  assert.equal(r.possible_commercial_mirror_pairs,0);
});

test('city and district mismatch is a collision, even if reference is identical',()=>{
  for(const altered of [{...OFFER_1007[1],city:'Rabat'},
    {...OFFER_1007[1],district:'Hay Salam'}]) {
    const r=reviewJ5CommercialCopies([OFFER_1007[0],altered]);
    assert.equal(r.possible_commercial_mirror_pairs,0);
  }
});

test('input order does not change ordered review results',()=>{
  const a=reviewJ5CommercialCopies([...OFFER_1007,...OFFER_1009]);
  const b=reviewJ5CommercialCopies([...OFFER_1009].reverse().concat([...OFFER_1007].reverse()));
  assert.deepEqual(a,b);
});

test('reject spoofed domain, URL ID contradiction, and unexpected query',()=>{
  const [record]=OFFER_1007;
  for(const override of [
    {source_url:record.source_url.replace('agenz.ma','evil-agenz.ma')},
    {source_url:record.source_url.replace('77532','77533')},
    {source_url:record.source_url+'?utm=1'},
    {source_url:record.source_url.replace('https:','http:')},
    {source_domain:'immo.mitula.ma'},
    {source_offer_id:'999999'}
  ]) {
    assert.throws(()=>reviewJ5CommercialCopies([{...record,...override}]),
      J5CommercialReviewRejected);
  }
});

test('cannot fake a source-attested raw capture or an admission flag',()=>{
  const [record]=OFFER_1007;
  assert.throws(()=>reviewJ5CommercialCopies([
    {...record,observation_kind:'verified_http_original'}
  ]),J5CommercialReviewRejected);
  assert.throws(()=>reviewJ5CommercialCopies([
    {...record,eligible_for_private_detail_staging:true}
  ]),/OBSERVATION_SCHEMA_INVALID/);
  assert.throws(()=>reviewJ5CommercialCopies([
    {...record,capture_sha256:'f'.repeat(64)}
  ]),/OBSERVATION_SCHEMA_INVALID/);
});

test('duplicate original IDs, missing fields and oversized batches fail closed',()=>{
  assert.throws(()=>reviewJ5CommercialCopies([...OFFER_1007,...OFFER_1007]),
    /DUPLICATE_SOURCE_ID/);
  const record={...OFFER_1007[0]};delete record.commercial_reference;
  assert.throws(()=>reviewJ5CommercialCopies([record]),/OBSERVATION_SCHEMA_INVALID/);
  assert.throws(()=>reviewJ5CommercialCopies(Array.from({length:21},()=>OFFER_1007[0])),
    /BOUNDED_OBSERVATIONS_REQUIRED/);
});

test('invalid reference and noninteger price or area rejected',()=>{
  for(const override of [
    {commercial_reference:'SAL-TA-1007/1009'},
    {commercial_reference:'SAL-TA-1007\n'},
    {price_mad:1350000.5},{surface_m2:NaN},
    {description_floor:101},{description_surface_m2:-5}
  ]) {
    assert.throws(()=>reviewJ5CommercialCopies([{...OFFER_1007[0],...override}]),
      J5CommercialReviewRejected);
  }
});

test('empty review cannot claim a matched offer',()=>{
  const r=reviewJ5CommercialCopies([]);
  assert.equal(r.observations,0);
  assert.equal(r.comparisons.length,0);
  assert.equal(r.possible_commercial_mirror_pairs,0);
  assert.equal(r.private_detail_staging,false);
});
