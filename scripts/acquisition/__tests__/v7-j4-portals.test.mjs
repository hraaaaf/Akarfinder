import test from 'node:test';
import assert from 'node:assert/strict';
import { assessJ4, reviewYakeeyDraftLinks, J4_MAX_RAW_URLS_PER_BATCH } from '../v7_parallel/j4_portal_intake.mjs';

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

test('combined Yakeey cap is enforced across BOTH channels, not separately', () => {
  const links=Array.from({length:30},(_,i)=>{
    const id='ca'+String(i+5000000);
    return 'https://yakeey.com/fr-ma/acheter-appartement-casa-'+id;
  });
  const records=Array.from({length:21},(_,i)=>{
    const id='ca'+String(i+6000000);
    return {id:'yakeey:'+id,platform:'yakeey',
      url:'https://yakeey.com/fr-ma/acheter-appartement-casa-'+id,
      detail_state:'not_fetched'};
  });
  assert.throws(()=>assessJ4({yakeeyDraftLinks:links,yakeeyDraftRecords:records}),
    /YAKEEY_COMBINED_CANDIDATE_LIMIT/);
  assert.equal(assessJ4({yakeeyDraftLinks:links,yakeeyDraftRecords:records.slice(0,20)})
    .yakeey_draft_unverified_links.length,50);
});

test('historical record and draft link preserve BOTH provenance channels without verification', () => {
  const url='https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319';
  const rows=assessJ4({yakeeyDraftLinks:[url],yakeeyDraftRecords:[
    {id:'yakeey:ca5003319',platform:'yakeey',url,detail_state:'not_fetched'}
  ]}).yakeey_draft_unverified_links;
  assert.equal(rows.length,1);
  assert.deepEqual(rows[0].evidence_sources,
    ['historical_kaynly_draft_source_link_only','third_party_draft_link_only']);
  assert.equal(rows[0].original_listing_id,null);
  assert.equal(rows[0].collector_merged,false);
  assert.equal(rows[0].source_detail_observed,false);
  assert.equal(rows[0].private_detail_staging,false);
  assert.equal(rows[0].public_admission,false);
});

test('Yakeey same candidate ID on two different URLs is rejected across input channels', () => {
  const url='https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319';
  const other='https://yakeey.com/fr-ma/acheter-maison-casa-ca5003319';
  assert.throws(()=>assessJ4({yakeeyDraftLinks:[url],yakeeyDraftRecords:[
    {id:'yakeey:ca5003319',platform:'yakeey',url:other,detail_state:'not_fetched'}
  ]}),/YAKEEY_CANDIDATE_ID_URL_COLLISION/);
});

test('duplicate historical records alone do not fabricate multiple evidence channels', () => {
  const url='https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319';
  const rows=assessJ4({yakeeyDraftRecords:[
    {id:'yakeey:ca5003319',platform:'yakeey',url,detail_state:'not_fetched'}
  ]}).yakeey_draft_unverified_links;
  assert.deepEqual(rows[0].evidence_sources,['historical_kaynly_draft_source_link_only']);
  assert.equal(rows[0].original_listing_id,null);
});

const avitoUrl = (i) => 'https://www.avito.ma/fr/casablanca/appartements/test_'+String(10000000+i)+'.htm';
const saroutyUrl = (i) => 'https://www.sarouty.ma/fr/plp/acheter/appartement-'+String(200000+i)+'.html';
const batch = (aCount, sCount) => ({
  mergedReports: {
    'avito.ma': {zeroDbWrites:true, stoppedEarly:null, listingUrls:Array.from({length:aCount},(_,i)=>avitoUrl(i))},
    'sarouty.ma': {zeroDbWrites:true, stoppedEarly:null, listingUrls:Array.from({length:sCount},(_,i)=>saroutyUrl(i))}
  }
});

test('J4 aggregate L8 limit rejects 601+400 even though each report is valid', () => {
  assert.equal(J4_MAX_RAW_URLS_PER_BATCH,1000);
  assert.throws(()=>assessJ4(batch(601,400)),/J4_AGGREGATE_URL_LIMIT/);
  const safe=assessJ4(batch(600,400));
  assert.equal(safe.raw_merged_source_url_count,1000);
  assert.equal(safe.merged_url_only_candidates.length,1000);
  assert.equal(safe.detailed_records,0);
  assert.equal(safe.db_writes,0);
});

test('J4 raw URL cap rejects duplicate inflation even if unique candidates are few', () => {
  const many={
    mergedReports:{
      'avito.ma':{zeroDbWrites:true,stoppedEarly:null,listingUrls:Array(600).fill(a)},
      'sarouty.ma':{zeroDbWrites:true,stoppedEarly:null,listingUrls:Array(401).fill(s)}
    }
  };
  assert.throws(()=>assessJ4(many),/J4_AGGREGATE_URL_LIMIT/);
  many.mergedReports['sarouty.ma'].listingUrls.pop();
  const ok=assessJ4(many);
  assert.equal(ok.raw_merged_source_url_count,1000);
  assert.equal(ok.duplicate_raw_merged_url_count,998);
  assert.deepEqual(ok.merged_candidate_counts_by_source,{'avito.ma':1,'sarouty.ma':1});
  assert.equal(ok.merged_url_only_candidates.length,2);
});

test('J4 Avito and Sarouty output order never depends on report-object key order', () => {
  const rA={zeroDbWrites:true,stoppedEarly:null,listingUrls:[avitoUrl(2),avitoUrl(1)]};
  const rS={zeroDbWrites:true,stoppedEarly:null,listingUrls:[saroutyUrl(2),saroutyUrl(1)]};
  const first=assessJ4({mergedReports:{'sarouty.ma':rS,'avito.ma':rA}});
  const second=assessJ4({mergedReports:{'avito.ma':rA,'sarouty.ma':rS}});
  assert.deepEqual(first.merged_url_only_candidates,second.merged_url_only_candidates);
  assert.deepEqual(first.merged_url_only_candidates.map(x=>x.original_listing_id),
    ['10000001','10000002','200001','200002']);
  assert.ok(first.merged_url_only_candidates.every(x=>
    x.source_report_authenticated===false && x.original_html_sha256_verified===false &&
    x.private_detail_staging===false && x.public_admission===false));
});

test('J4 Yakeey remains separate from 1000-row V7 merged L8 intake', () => {
  const x=assessJ4({...batch(600,400),
    yakeeyDraftLinks:['https://yakeey.com/fr-ma/acheter-appartement-casa-ca5003319']});
  assert.equal(x.merged_url_only_candidates.length,1000);
  assert.equal(x.yakeey_draft_unverified_links.length,1);
  assert.equal(x.yakeey_draft_unverified_links[0].original_listing_id,null);
  assert.equal(x.yakeey_draft_unverified_links[0].collector_merged,false);
  assert.equal(x.yakeey_draft_unverified_links[0].private_detail_staging,false);
});
