// Bridge genuine archived source observations into the existing freshness/rights shadow gate.
// No external access, no DB, no automated promotion.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateListing} from './fresh-active-unique-shadow-v1.mjs';

export function buildReviewQueue(rows){
 if(!Array.isArray(rows)||rows.length!==338)throw Error('expected_338_source_records');
 const ids=new Set(),sourceIDs=new Set(),result=[];
 for(const r of rows){
  if(!Number.isSafeInteger(r.feenway_id)||r.feenway_id<=0||ids.has(r.feenway_id))throw Error('duplicate_or_invalid_feenway_id');
  ids.add(r.feenway_id);
  if(r.eligible_for_db!==false||r.current_availability_verified!==false||r.freshness_verified!==false||r.physical_uniqueness_verified!==false||r.reuse_rights_verified!==false)throw Error('unsafe_historical_promotion');
  if(!Array.isArray(r.evidence)||!r.evidence.length||!r.fields||typeof r.fields!=='object')throw Error('invalid_historical_provenance');
  if(!Array.isArray(r.evidence)||r.evidence.some(x=>!['base','review100','full81','signal60'].includes(x)))throw Error('unrecognized_evidence');
  if(r.source_identity!=null){
   if(typeof r.source_identity!=='string'||!r.source_identity||typeof r.source_portal!=='string'||!r.source_portal)throw Error('untrusted_source_identity');
   const src=r.source_portal+'|'+r.source_identity;
   if(sourceIDs.has(src))throw Error('duplicate_original_source_identity');
   sourceIDs.add(src);
  }else if(r.source_portal!==null)throw Error('unmatched_source_identity');
  const fields=r.fields,keys=['city','district','transaction','price_number_mad','surface_number_m2'];
  if(r.five_fields_strict===true&&keys.some(k=>fields[k]===null||fields[k]===undefined||fields[k]===''))throw Error('strict_five_fields_without_values');
  const quarantined=!r.source_identity||String(r.gate).startsWith('quarantine');
  const economic=typeof r.economic_warning==='string'&&r.economic_warning.length>0;
  const partial=r.evidence.includes('signal60')&&r.identity_retained===true;
  const hasPrice=partial&&r.price_signal===true&&fields.price_number_mad!=null;
  const hasSurface=partial&&r.surface_signal===true&&fields.surface_number_m2!=null;
  const queue=quarantined?'quarantine_source_or_identity':
   economic?'review_economic_meaning':
   r.five_fields_strict===true?'historical_complete_source_evidence':
   hasPrice&&hasSurface?'historical_partial_price_and_surface':
   hasPrice||hasSurface?'historical_partial_one_numeric_field':'source_identity_only';
  const missing=keys.filter(k=>fields[k]===null||fields[k]===undefined||fields[k]==='');
  result.push({
   feenway_id:r.feenway_id,source_portal:r.source_portal,source_identity:r.source_identity,source_url:r.source_url,
   review_queue:queue,historical_evidence:r.evidence,source_gate:r.gate,
   source_fields:fields,source_date_metadata:r.source_date_metadata,economic_warning:r.economic_warning,
   missing_source_values:missing,requires_current_evidence:['availability','freshness','economic_price_basis','physical_uniqueness','reuse_rights'],
   requires_access_terms_review:true,commercial_status:'not_eligible_unverified',eligible_for_db:false,publishable:false
  });
 }
 const order=['historical_complete_source_evidence','historical_partial_price_and_surface','historical_partial_one_numeric_field','review_economic_meaning','source_identity_only','quarantine_source_or_identity'];
 result.sort((a,b)=>order.indexOf(a.review_queue)-order.indexOf(b.review_queue)||Number(b.source_url!==null)-Number(a.source_url!==null)||a.feenway_id-b.feenway_id);
 const count=key=>result.filter(x=>x.review_queue===key).length;
 const queues=Object.fromEntries(order.map(k=>[k,count(k)]));
 const summary={
  schema:'AKARFINDER_FEENWAY_ARCHIVED338_QUALITY_QUEUE_V1',input_records:rows.length,source_identifiers:sourceIDs.size,
  queue_counts:queues,total_queued:result.length,
  missing_source_url:result.filter(x=>!x.source_url).length,
  economic_warnings:result.filter(x=>x.economic_warning).length,
  current_fresh_verified:0,current_available_verified:0,physically_unique_verified:0,reuse_rights_verified:0,
  eligible_for_db:0,publication_eligible:0,network_requests:0,db_writes:0,
  note:'Historical source-observation triage only. No claim of live availability or licence. Existing active-unique shadow is a separate mandatory conservative gate.'
 };
 if(result.length!==338||sourceIDs.size!==337||summary.missing_source_url!==20||queues.historical_complete_source_evidence!==50||queues.historical_partial_price_and_surface!==18||queues.historical_partial_one_numeric_field!==37||queues.review_economic_meaning!==3||queues.source_identity_only!==204||queues.quarantine_source_or_identity!==26)throw Error('unexpected_real_corpus_statistics');
 return {rows:result,summary};
}

export function certifyConservativeShadow(records){
 for(const r of records){
  // Archived source fields are not same-card multi-run proof of current activity.
  const base={source:r.source_portal,identity:r.source_identity,
   five_field_observed_consistent:false,cross_run_conflicts:[]};
  const verdict=evaluateListing(base,{},'2026-10-30');
  if(verdict.ready_for_publication||Object.values(verdict.checks).some(Boolean))throw Error('freshness_shadow_promotion_violation');
 }
 return {rows:records.length,existing_shadow_gate:'zero_trust_historical',publishable:0};
}
export function run(){
 const input='docs/data/feenway-archived338-source-evidence-2026-10-30.jsonl';
 const records=fs.readFileSync(input,'utf8').trimEnd().split('\n').map(JSON.parse);
 const {rows,summary}=buildReviewQueue(records);
 const shadow=certifyConservativeShadow(rows);
 const out=path.resolve(process.argv[2]||'.tmp/feenway-338-quality');
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'review-queue.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({...summary,shadow},null,2)+'\n');
 console.log(JSON.stringify({...summary,shadow}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===decodeURIComponent(new URL(import.meta.url).pathname)){
 try{run();}catch(e){console.error(e);process.exitCode=1;}
}
