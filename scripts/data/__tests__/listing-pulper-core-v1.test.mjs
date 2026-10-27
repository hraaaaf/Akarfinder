import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectRaw,toMold,processBatch,propertyType,freshness,verifyMold} from '../../acquisition/listing-pulper-core-v1.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const mold=JSON.parse(readFileSync(resolve(here,'../../../data/molds/property-listing-v1.json'),'utf8'));
const makeRaw=(overrides={})=>({source:'mubawab.ma',source_identity:'a:8399673',source_url:'https://www.mubawab.ma/fr/a/8399673/d',final_url:'https://www.mubawab.ma/fr/a/8399673/d',http_status:200,observed_at:'2026-10-27T09:00:00Z',title:'Appartement à louer à Casablanca',markdown:'### 11 000 DH\n90m²\n### Casablanca Finance City à Casablanca\n',...overrides});
const makePrimary=(overrides={})=>({schema:'AKARFINDER_PRIMARY_PARSER_V1',source:'mubawab.ma',identity:'a:8399673',price_mad:11000,surface_m2:90,city:'Casablanca',district:'Casablanca Finance City',transaction:'rent',price_period:'month',surface_basis:'headline',identity_verified:true,primary_block_verified:true,issues:[],...overrides});
test('V1 mold weights and field definitions are valid',()=>{assert.equal(verifyMold(mold),mold);assert.ok(mold.fields.bedrooms);assert.equal(mold.publication_requires.length,5);});
test('complete fields rank as review not commercial eligibility',()=>{
 const a=toMold(makeRaw(),makePrimary(),mold);
 assert.equal(a.status.gate,'review_complete');assert.equal(a.status.eligible,false);assert.equal(a.status.fields_5_present,true);
 assert.equal(a.fields.price_mad,11000);assert.equal(a.fields.surface_m2,90);assert.equal(a.fields.bedrooms,null);
 assert.equal(a.status.score.freshness,null);assert.ok(a.status.score.ranking<=70);
 assert.ok(!JSON.stringify(a).includes('Appartement à louer à Casablanca'));
});
test('freshness derives only from verified original-page publication',()=>{
 const r=makeRaw({source_published_at:'2026-10-25T09:00:00Z'});
 const x=toMold(r,makePrimary(),mold);assert.equal(x.status.score.freshness,null);assert.equal(x.fields.published_at,null);
 const v=toMold({...r,published_evidence:'explicit_source_page'},makePrimary(),mold);
 assert.equal(v.status.score.freshness,100);assert.equal(v.fields.published_at,'2026-10-25T09:00:00.000Z');
 assert.equal(freshness('2026-11-01T09:00:00Z','explicit_source_page',r.observed_at,mold).score,null);
});
test('raw collection time does not masquerade as freshness',()=>{const p=toMold(makeRaw(),makePrimary(),mold);assert.equal(p.status.freshness_evidence,'unverified');assert.equal(p.status.freshness_verified,false);});
test('unknown bedrooms and type do not become invented zeros',()=>{
 const x=toMold(makeRaw({title:'Immeuble'}),makePrimary(),mold);assert.equal(x.fields.property_type,'unknown');assert.equal(x.fields.bedrooms,null);
 assert.equal(propertyType('Studio meublé'),'studio');assert.equal(propertyType('villa à vendre'),'villa');
});
test('monthly rent period absent is a review, not filled by default',()=>{const x=toMold(makeRaw(),makePrimary({price_period:null,issues:['rental_period_unconfirmed']}),mold);assert.equal(x.fields.price_period,null);assert.ok(x.status.score.penalty>=12);assert.equal(x.status.eligible,false);});
test('economic anomalies penalize and segregate',()=>{for(const issue of ['price_per_m2','daily_or_nightly_rent','pas_de_porte','conflicting_primary_prices']){const x=toMold(makeRaw(),makePrimary({issues:[issue]}),mold);assert.equal(x.status.gate,'review_anomaly');assert.equal(x.status.eligible,false);}});
test('source cross-host link is quarantined',()=>{const x=toMold(makeRaw({source_url:'https://evil.invalid/fr/a/8399673'}),makePrimary(),mold);assert.equal(x.status.gate,'quarantine');assert.equal(x.fields.price_mad,null);assert.ok(x.status.issues.includes('raw_source_url_host_mismatch'));});
test('mismatched adapter cannot silently borrow another property',()=>{const x=toMold(makeRaw(),makePrimary({identity:'a:7777777'}),mold);assert.equal(x.status.gate,'quarantine');assert.equal(x.fields.price_mad,null);assert.equal(x.status.eligible,false);});
test('HTTP 403 or 429 must never be admitted',()=>{for(const http_status of [403,429]){const r=toMold(makeRaw({http_status}),makePrimary(),mold);assert.equal(r.status.gate,'quarantine');}});
test('duplicate unchanged events collapsed, changed snapshots retained',()=>{const r=makeRaw();const next=makeRaw({markdown:r.markdown+' updated'});const batch=processBatch([r,r,next],()=>makePrimary(),mold);assert.equal(batch.output.length,2);assert.equal(batch.stats.same_snapshot_repeats,1);assert.equal(batch.stats.source_updates,1);assert.ok(batch.output[1].status.issues.includes('source_content_updated'));});
test('zero current admission even with all good scores',()=>{
 const raw=makeRaw({published_evidence:'explicit_source_page',source_published_at:'2026-10-26T10:00:00Z'});const a=toMold(raw,makePrimary({bedrooms:2}),mold);
 assert.ok(a.status.score.ranking>80);assert.equal(a.status.eligible,false);assert.equal(a.status.availability_verified,false);assert.equal(a.status.reuse_rights_verified,false);
});
test('invalid mold score settings must fail closed',()=>{assert.throws(()=>verifyMold({...mold,technical_weights:{price:99}}),/invalid_technical_weights/);});
test('raw missing inputs never leak PII into normalized mold',()=>{
 const raw=makeRaw({markdown:'Téléphone +212612345678, email hello@example.com'});
 const x=toMold(raw,null,mold),text=JSON.stringify(x);
 assert.ok(!text.includes('612345678'));assert.ok(!text.includes('hello@example.com'));assert.equal(x.status.eligible,false);
});