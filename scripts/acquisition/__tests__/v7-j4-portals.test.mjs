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
  const r=reviewYakeeyDraftLinks(['https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319']);
  assert.equal(r.length,1);
  assert.equal(r[0].original_listing_id,null);
  assert.equal(r[0].candidate_source_offer_id_from_url,'ca5003319');
  assert.equal(r[0].collector_merged,false);
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


test('real historical Kaynly #1146 Yakeey JSONL record shape remains quarantine', async () => {
  const { reviewKaynlyDraftRecords } = await import('../v7_parallel/j4_portal_intake.mjs');
  const record={id:'yakeey:ca5003319',platform:'yakeey',
    url:'https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319',
    detail_state:'not_fetched'};
  const rows=reviewKaynlyDraftRecords([record,record]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].candidate_source_offer_id_from_url,'ca5003319');
  assert.equal(rows[0].original_listing_id,null);
  assert.equal(rows[0].historical_collector_pr,1146);
  assert.equal(rows[0].collector_merged,false);
  assert.equal(rows[0].private_detail_staging,false);
});

test('historical Yakeey record forged ID or fetched status is rejected', async () => {
  const { reviewKaynlyDraftRecords } = await import('../v7_parallel/j4_portal_intake.mjs');
  const record={id:'yakeey:ca5003319',platform:'yakeey',
    url:'https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319',
    detail_state:'not_fetched'};
  assert.throws(()=>reviewKaynlyDraftRecords([{...record,id:'yakeey:ca5003320'}]),/ID_MISMATCH/);
  assert.throws(()=>reviewKaynlyDraftRecords([{...record,detail_state:'fetched'}]),/RECORD_INVALID/);
  assert.throws(()=>reviewKaynlyDraftRecords([{...record,rights_verified:true}]),/RECORD_INVALID/);
});

test('Yakeey nonlisting URLs fail closed, no generic search promotion', () => {
  for(const url of ['https://www.yakeey.com/annonces-exemple',
     'https://yakeey.com/fr-ma/acheter-appartement-casa',
     'https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319?utm=1',
     'https://yakeey.com/fr-ma/acheter-appartement-casa-%2e%2e']) {
    assert.throws(()=>reviewYakeeyDraftLinks([url]));
  }
});

test('merge duplicate Kaynly-record/link to ONE source-ID candidate, not detail', () => {
  const url='https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319';
  const x=assessJ4({yakeeyDraftLinks:[url],yakeeyDraftRecords:[
    {id:'yakeey:ca5003319',platform:'yakeey',url,detail_state:'not_fetched'}
  ]});
  assert.equal(x.yakeey_draft_unverified_links.length,1);
  assert.equal(x.yakeey_draft_unverified_links[0].original_listing_id,null);
  assert.equal(x.detailed_records,0);
  assert.equal(x.db_writes,0);
});
