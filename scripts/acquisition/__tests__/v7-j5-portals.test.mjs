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
