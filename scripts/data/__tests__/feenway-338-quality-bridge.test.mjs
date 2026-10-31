import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildReviewQueue,certifyConservativeShadow} from '../feenway-338-quality-bridge.mjs';
const input='docs/data/feenway-archived338-source-evidence-2026-10-30.jsonl';
const rows=fs.readFileSync(input,'utf8').trimEnd().split('\n').map(JSON.parse);
test('338 genuine entries classified into distinct actionable historical queues',()=>{
 const {rows:queue,summary}=buildReviewQueue(rows);
 assert.equal(summary.input_records,338);
 assert.deepEqual(summary.queue_counts,{
  historical_complete_source_evidence:50,
  historical_partial_price_and_surface:18,
  historical_partial_one_numeric_field:37,
  review_economic_meaning:3,
  source_identity_only:204,
  quarantine_source_or_identity:26
 });
 assert.equal(summary.source_identifiers,337);assert.equal(summary.missing_source_url,20);
 assert.ok(queue.every(x=>!x.eligible_for_db&&!x.publishable));
});
test('existing active unique shadow confirms zero current activity or publication',()=>{
 const {rows:queue}=buildReviewQueue(rows);
 assert.deepEqual(certifyConservativeShadow(queue),{rows:338,existing_shadow_gate:'zero_trust_historical',publishable:0});
});
test('queue snapshot reproducible byte-for-byte from original observations',()=>{
 const {rows:queue,summary}=buildReviewQueue(rows);
 assert.equal(queue.map(x=>JSON.stringify(x)).join('\n')+'\n',
   fs.readFileSync('docs/data/feenway-338-quality-review-queue-2026-10-30.jsonl','utf8'));
 assert.deepEqual(summary,JSON.parse(fs.readFileSync('docs/data/feenway-338-quality-summary-2026-10-30.json','utf8')));
});
test('fail closed on missing provenance or asserted availability / rights',()=>{
 const bad=rows.map(x=>({...x}));
 bad[0].reuse_rights_verified=true;
 assert.throws(()=>buildReviewQueue(bad),/unsafe_historical_promotion/);
 const copy=rows.map(x=>({...x}));copy[1].source_portal=copy[0].source_portal;copy[1].source_identity=copy[0].source_identity;
 assert.throws(()=>buildReviewQueue(copy),/duplicate_original_source_identity/);
});
test('semantic traps and source quarantine cannot be silently promoted',()=>{
 const {rows:queue}=buildReviewQueue(rows);
 assert.deepEqual(queue.filter(x=>x.review_queue==='review_economic_meaning').map(x=>x.feenway_id).sort((a,b)=>a-b),[233683,234551,236104]);
 assert.equal(queue.filter(x=>x.review_queue==='quarantine_source_or_identity').length,26);
 assert.ok(queue.filter(x=>x.review_queue==='historical_complete_source_evidence').every(x=>!x.economic_warning));
});
