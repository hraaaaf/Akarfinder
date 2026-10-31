import fs from 'node:fs';
import path from 'node:path';
const files=[
'docs/data/feenway-next238-origin-reconciled-neon-2026-10-27.jsonl',
'docs/data/feenway-canary81-source-fivefields-2026-10-26.jsonl',
'docs/data/feenway-canary100-source-checked-2026-10-26.jsonl',
'docs/data/feenway-next231-primary60-source-signals-2026-10-27.jsonl'];
export function build(packs) {
 const [base,full,review,signals]=packs;
 if(base.length!==238||full.length!==81||review.length!==100||signals.length!==60)throw Error('unexpected_input_size');
 const map=new Map(),sourceMap=new Map();
 function add(r,tag){
  const id=r.feenway_id,portal=r.source??r.original_source??null,key=r.source_key??r.original_identity??r.source_identity??null;
  if(!Number.isSafeInteger(id)||id<=0)throw Error('invalid_id');
  if(!portal||!key){if(tag!=='base'||r.quality_gate!=='quarantine_missing_source_link')throw Error('unproven_source');}
  if(portal&&key){
   const sk=portal+'|'+key;
   if(sourceMap.has(sk)&&sourceMap.get(sk)!==id)throw Error('cross_id_source_collision');
   sourceMap.set(sk,id);
  }
  const url=r.origin_url??r.original_url??null;
  if(!map.has(id)) map.set(id,{feenway_id:id,source_portal:portal,source_identity:key,source_url:url,evidence:[tag],fields:{city:null,district:null,transaction:null,price_number_mad:null,surface_number_m2:null},source_date_metadata:null,economic_warning:null,five_fields_strict:false,identity_retained:false,price_signal:false,surface_signal:false,gate:'review_historical_identity_only',current_availability_verified:false,freshness_verified:false,physical_uniqueness_verified:false,reuse_rights_verified:false,eligible_for_db:false});
  else{
   const x=map.get(id);
   if(x.source_portal!==portal||x.source_identity!==key)throw Error('cross_file_identity_conflict');
   if(x.source_url&&url&&x.source_url!==url)throw Error('source_url_conflict');
   if(x.evidence.includes(tag))throw Error('duplicate_within_input');
   if(!x.source_url)x.source_url=url;
   x.evidence.push(tag);
  }
 }
 base.forEach(x=>add(x,'base'));review.forEach(x=>add(x,'review100'));full.forEach(x=>add(x,'full81'));signals.forEach(x=>add(x,'signal60'));
 for(const r of review){
  if([r.activity_verified,r.freshness_verified,r.physical_uniqueness_verified,r.reuse_rights_verified,r.publishable_certified].some(x=>x!==false))throw Error('unsafe_historical_review');
  const x=map.get(r.feenway_id);if(!x.evidence.includes('full81'))x.gate=r.source_quality_gate;
 }
 for(const r of full){
  if([r.availability_verified,r.physically_unique_verified,r.rights_verified,r.publishable_certified,r.commercial_eligibility_certified,r.economic_interpretation_certified].some(x=>x!==false))throw Error('unsafe_full_claim');
  if(r.source_five_fields_strict===true&&r.source_page_retrieved!==true)throw Error('strict_inaccessible');
  const x=map.get(r.feenway_id);
  x.fields={city:r.source_city??null,district:r.source_district??null,transaction:r.transaction??null,price_number_mad:r.source_price_mad??null,surface_number_m2:r.source_surface_m2??null};
  x.source_date_metadata=r.source_date_metadata??null;x.economic_warning=r.explicit_economic_semantic_flag??null;
  x.five_fields_strict=r.source_five_fields_strict===true;x.identity_retained=r.source_id_in_final_url===true;
  x.price_signal=r.source_price_mad!=null;x.surface_signal=r.source_surface_m2!=null;
  x.gate=r.quality_gate==='quarantine_source_unavailable'?'quarantine_source_unavailable':x.economic_warning?'review_economic_semantics':x.five_fields_strict?'review_historical_five_fields':'review_incomplete_or_conflicting';
 }
 for(const r of signals){
  if(r.eligible!==false||r.primary_5fields_certified!==false||[r.activity_certified,r.physical_uniqueness_certified,r.rights_verified].some(x=>x===true))throw Error('unsafe_partial_claim');
  const x=map.get(r.feenway_id);
  if(x.evidence.includes('full81'))throw Error('unexpected_overlap');
  const identityOkay=r.source_identity_retained===true&&r.status==='source_page_id_observed';
  x.identity_retained=identityOkay;
  if(!identityOkay){x.gate=r.status==='source_unavailable'?'quarantine_source_unavailable':'quarantine_identity_unverified';continue;}
  x.fields.price_number_mad=r.source_price_candidate_mad??null;
  x.fields.surface_number_m2=r.source_area_candidate_m2??null;
  x.price_signal=r.source_price_signal===true&&x.fields.price_number_mad!==null;
  x.surface_signal=r.source_area_signal===true&&x.fields.surface_number_m2!==null;
  x.source_date_metadata=r.published_date_metadata??null;x.economic_warning=r.unit_flag??null;
  x.gate='review_historical_partial_numbers';
 }
 const rows=[...map.values()].sort((a,b)=>a.feenway_id-b.feenway_id);
 const n=f=>rows.filter(f).length;
 const summary={schema:'AKARFINDER_FEENWAY_HISTORICAL_338_SOURCE_RECORDS_V1',rows:rows.length,distinct_original_source_identities:sourceMap.size,
  strict_historical_five_fields:n(x=>x.five_fields_strict),strict_without_known_warning:n(x=>x.five_fields_strict&&!x.economic_warning),
  signals60_identity_retained:n(x=>x.evidence.includes('signal60')&&x.identity_retained),
  signals60_price_retained:n(x=>x.evidence.includes('signal60')&&x.price_signal),
  signals60_surface_retained:n(x=>x.evidence.includes('signal60')&&x.surface_signal),
  signals60_both_retained:n(x=>x.evidence.includes('signal60')&&x.price_signal&&x.surface_signal),
  source_urls_present:n(x=>!!x.source_url),current_fresh_verified:0,current_available_verified:0,rights_verified:0,physical_unique_verified:0,eligible_for_db:0,requests:0,db_writes:0};
 if(rows.length!==338||sourceMap.size!==337||summary.strict_historical_five_fields!==53||summary.strict_without_known_warning!==50||summary.signals60_identity_retained!==55||summary.signals60_price_retained!==30||summary.signals60_surface_retained!==43||summary.signals60_both_retained!==18)throw Error('dataset_invariant_failure');
 if(rows.some(x=>x.eligible_for_db||x.current_availability_verified||x.freshness_verified||x.reuse_rights_verified||x.physical_uniqueness_verified))throw Error('illegal_promotion');
 return {rows,summary};
}
export function load(){return files.map(f=>fs.readFileSync(f,'utf8').trimEnd().split('\n').map(JSON.parse));}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const {rows,summary}=build(load()),dir=path.resolve(process.argv[2]||'.tmp/feenway-archived338');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'source-records.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
 fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify(summary));
}