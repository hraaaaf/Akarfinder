import test from 'node:test';
import assert from 'node:assert/strict';
import {assessJ5,remainingPortalPlan,J5_PRIORITY} from '../v7_parallel/j5_remaining_portals.mjs';
const report = urls => ({zeroDbWrites:true,stoppedEarly:null,listingUrls:urls});

test('remaining portal priority exactly preserves agreed lane', () => {
  assert.deepEqual(J5_PRIORITY,[
    'mubawab.ma','marocannonces.com','masaken.ma',
    'immoneuf.avito.ma','immo.mitula.ma','maportail-immobilier.ma'
  ]);
  assert.equal(remainingPortalPlan().length,6);
});

test('two existing collectors reused and never claimed as detail', () => {
  const x=assessJ5({
    'mubawab.ma':report(['https://www.mubawab.ma/fr/a/9961000/flat']),
    'marocannonces.com':report(['https://www.marocannonces.com/annonce/987654/appartement.html'])
  });
  assert.equal(x.candidates_count,2);
  assert.equal(x.detailed_listings,0);
  assert.equal(x.db_writes,0);
  assert.equal(x.source_network_requests,0);
  assert.equal(x.physical_uniqueness_verified,false);
  assert.ok(x.source_url_candidates.every(x=>!x.private_detail_staging));
});

test('non-integrated sites remain explicitly disabled, especially mirror sources', () => {
  const plan=remainingPortalPlan();
  assert.deepEqual(plan.filter(x=>x.status==='not_integrated').map(x=>x.portal),J5_PRIORITY.slice(2));
  assert.ok(plan.find(x=>x.portal==='immo.mitula.ma').risk.includes('upstream'));
  assert.ok(plan.find(x=>x.portal==='immoneuf.avito.ma').risk.includes('upstream'));
  assert.ok(plan.every(x=>!x.live_enabled && !x.public_admission));
});

test('reject forged claim of integrated Masaken lane', () => {
  assert.throws(()=>assessJ5({'masaken.ma':report([])}),/J5_SOURCE_NOT_INTEGRATED/);
});

test('blocked existing source fails closed', () => {
  assert.throws(()=>assessJ5({'mubawab.ma':{...report([]),stoppedEarly:'http_403'}}),/UNSAFE_OR_INCOMPLETE_REPORT/);
});

test('no listing should be fabricated for empty inputs', () => {
  const x=assessJ5();
  assert.equal(x.candidates_count,0);
  assert.equal(x.detailed_listings,0);
  assert.equal(x.unintegrated.length,4);
});

test('global J5 raw batch bound holds across two individually acceptable L8 reports', () => {
  const mub=Array.from({length:601},(_,i)=>'https://www.mubawab.ma/fr/a/'+(9961000+i)+'/flat');
  const maroc=Array.from({length:400},(_,i)=>'https://www.marocannonces.com/annonce/'+(987654+i)+'/appartement.html');
  assert.throws(()=>assessJ5({'mubawab.ma':report(mub),'marocannonces.com':report(maroc)}),
    /J5_AGGREGATE_URL_LIMIT/);
  const atLimit=assessJ5({'mubawab.ma':report(mub.slice(0,600)),
    'marocannonces.com':report(maroc)});
  assert.equal(atLimit.candidates_count,1000);
  assert.equal(atLimit.raw_source_url_count,1000);
  assert.equal(atLimit.duplicate_raw_url_count,0);
  assert.equal(atLimit.db_writes,0);
});

test('J5 duplicate raw links do not become additional candidates or physical-property proof', () => {
  const url='https://www.mubawab.ma/fr/a/9961000/flat';
  const r=assessJ5({'mubawab.ma':report([url,url,url])});
  assert.equal(r.raw_source_url_count,3);
  assert.equal(r.candidates_count,1);
  assert.equal(r.duplicate_raw_url_count,2);
  assert.deepEqual(r.candidate_counts_by_source,
    {'mubawab.ma':1,'marocannonces.com':0});
  assert.equal(r.source_url_candidates[0].original_html_sha256_verified,false);
  assert.equal(r.source_url_candidates[0].source_report_authenticated,false);
  assert.equal(r.physical_uniqueness_verified,false);
  assert.equal(r.detailed_listings,0);
});

test('J5 output order stable regardless of original reports object insertion', () => {
  const mab='https://www.mubawab.ma/fr/a/9961000/flat';
  const mar='https://www.marocannonces.com/annonce/987654/appartement.html';
  const a=assessJ5({'marocannonces.com':report([mar]),'mubawab.ma':report([mab])});
  const b=assessJ5({'mubawab.ma':report([mab]),'marocannonces.com':report([mar])});
  assert.deepEqual(a.source_url_candidates,b.source_url_candidates);
  assert.deepEqual(a.candidate_counts_by_source,b.candidate_counts_by_source);
  assert.equal(a.candidates_count,2);
});

test('J5 rejects raw batch overflow even if source URL repeats identically', () => {
  const url='https://www.mubawab.ma/fr/a/9961000/flat';
  assert.throws(()=>assessJ5({
    'mubawab.ma':report(Array(700).fill(url)),
    'marocannonces.com':report(Array(301).fill(
      'https://www.marocannonces.com/annonce/987654/appartement.html'))
  }),/J5_AGGREGATE_URL_LIMIT/);
});
