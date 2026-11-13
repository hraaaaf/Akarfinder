import test from 'node:test';
import assert from 'node:assert/strict';
import { assessJ4, reviewYakeeyDraftLinks } from '../v7_parallel/j4_portal_intake.mjs';

const a = 'https://www.avito.ma/fr/casablanca/appartements/test_12345678.htm';
const s = 'https://www.sarouty.ma/fr/plp/acheter/appartement-avec-balcon-123456.html';
const report = url => ({zeroDbWrites:true,stoppedEarly:null,listingUrls:[url]});

test('Avito and Sarouty use merged existing L8 identity functions', () => {
  const x = assessJ4({mergedReports:{'avito.ma':report(a),'sarouty.ma':report(s)}});
  assert.equal(x.merged_url_only_candidates.length,2);
  assert.deepEqual(x.merged_url_only_candidates.map(x=>x.original_listing_id).sort(),['123456','12345678']);
  assert.equal(x.detailed_records,0);
  assert.equal(x.unique_physical_properties,null);
  assert.equal(x.db_writes,0);
});

test('Yakeey draft link is NOT an integrated connector or property ID', () => {
  const r=reviewYakeeyDraftLinks(['https://www.yakeey.com/annonces-exemple']);
  assert.equal(r.length,1);
  assert.equal(r[0].original_listing_id,null);
  assert.equal(r[0].connector_merged,false);
  assert.equal(r[0].private_detail_staging,false);
});

test('hard block / partial source report is rejected in full', () => {
  assert.throws(()=>assessJ4({mergedReports:{'avito.ma':{...report(a),stoppedEarly:'http_429'}}}),/UNSAFE_OR_INCOMPLETE_REPORT/);
});

test('Yakeey redirects/spoofs/queries are not promoted', () => {
  for(const x of ['https://yakeey.com.evil.example/p',
     'http://www.yakeey.com/p','https://www.yakeey.com:9443/p',
     'https://www.yakeey.com/p?ref=m','https://www.yakeey.com/']){
    assert.throws(()=>reviewYakeeyDraftLinks([x]));
  }
});

test('rejects another portal inside J4 source reports', () => {
  assert.throws(()=>assessJ4({mergedReports:{'mubawab.ma':report('https://www.mubawab.ma/fr/a/9961000')}}),/J4_SOURCE_NOT_WIRED/);
});

test('dedupe within existing source ID and never claim physical uniqueness', () => {
  const x=assessJ4({mergedReports:{'avito.ma':report(a), 'sarouty.ma':report(s)},yakeeyDraftLinks:[]});
  assert.equal(x.unique_physical_properties,null);
  assert.equal(x.source_network_requests,0);
  assert.equal(x.detailed_records,0);
});
