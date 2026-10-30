#!/usr/bin/env node
// N04: strictly offline pilot selection, no network / DB / publishing.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const sha256=x=>createHash('sha256').update(x).digest('hex');
export function parseJsonl(text){
 if(typeof text!=='string'||!text.trim())throw Error('empty_input');
 return text.trimEnd().split('\n').map((s,i)=>{try{return JSON.parse(s);}catch{throw Error('bad_jsonl_'+(i+1));}});
}
const QUOTAS={'avito.ma':4,'mubawab.ma':3,'agenz.ma':2,'yakeey.com':1};
export function select(rows){
 if(!Array.isArray(rows)||rows.length!==81)throw Error('expected_81_rows');
 const ids=new Set(),sourceIds=new Set();
 for(const r of rows){
  if(!Number.isSafeInteger(r.feenway_id)||r.feenway_id<=0||ids.has(r.feenway_id))throw Error('invalid_feenway_identity');
  ids.add(r.feenway_id);
  if(typeof r.source_portal!=='string'||typeof r.source_identity!=='string'||!r.source_identity||sourceIds.has(r.source_portal+'|'+r.source_identity))throw Error('invalid_original_identity');
  sourceIds.add(r.source_portal+'|'+r.source_identity);
  if(r.eligible_for_db!==false||r.publishable!==false)throw Error('unsafe_eligibility_claim');
  if(!Array.isArray(r.required_positive_evidence_missing)||r.required_positive_evidence_missing.length!==5||!Array.isArray(r.missing_source_values))throw Error('incomplete_proof_gates');
 }
 const all=[...rows].sort((a,b)=>a.feenway_id-b.feenway_id);
 const clean=all.filter(x=>x.review_queue==='review_numeric_match_not_commercial'&&x.economic_warning===null&&x.missing_source_values.length===0);
 const primary=Object.entries(QUOTAS).flatMap(([portal,num])=>{
  const pool=clean.filter(x=>x.source_portal===portal);
  if(pool.length<num)throw Error('insufficient_'+portal);
  return pool.slice(0,num).map(x=>({feenway_id:x.feenway_id,portal,source_identity:x.source_identity,role:'manual_candidate'}));
 });
 const flags=['price_is_per_square_meter','price_is_daily_short_stay','pas_de_porte_not_monthly_rent'];
 const controls=flags.map(flag=>{
  const r=all.find(x=>x.economic_warning===flag);
  if(!r)throw Error('missing_economic_control');
  return {feenway_id:r.feenway_id,portal:r.source_portal,source_identity:r.source_identity,role:'economic_control',warning:flag};
 });
 controls.push(...all.filter(x=>x.review_queue==='quarantine_source_unavailable').slice(0,2).map(x=>({feenway_id:x.feenway_id,portal:x.source_portal,source_identity:x.source_identity,role:'unavailable_control'})));
 const historical=clean.find(x=>x.source_portal==='sarouty.ma');
 if(!historical)throw Error('missing_historical_control');
 controls.push({feenway_id:historical.feenway_id,portal:historical.source_portal,source_identity:historical.source_identity,role:'age_control_not_freshness_proof'});
 if(primary.length!==10||controls.length!==6||new Set([...primary,...controls].map(x=>x.feenway_id)).size!==16)throw Error('pilot_collision');
 const withGates=x=>({...x,access_permission:'not_verified',portal_terms:'not_verified',reuse_rights:'not_verified',personal_data_compliance:'not_verified',current_availability:'not_verified',current_freshness:'not_verified',economic_meaning:'not_verified',physical_uniqueness:'not_verified',review_state:'blocked_pre_access',eligible_for_db:false,publishable:false});
 return {schema:'FEENWAY_N04_PREACCESS_PILOT_V1',source:'N03d 81 historical review records',selection:'fixed source quotas, ascending FeenWay ID, not commercial quality ranking',population:81,
  quotas:QUOTAS,primary:primary.map(withGates),controls:controls.map(withGates),
  forbidden:['new_detail_requests','blocked_api_requests','reused_text_photos_contacts','db_write','production_deploy'],
  external_access_authorized:0,eligible_for_db:0,report_only:true};
}
async function main(){
 const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>x.slice(2).split(/=(.*)/s).slice(0,2)));
 const source=resolve(args.source||'docs/data/feenway-n03d-proof-gaps-81-2026-10-30.jsonl'),out=resolve(args.out||'.tmp/feenway-n04');
 const raw=await readFile(source,'utf8'),plan=select(parseJsonl(raw));
 const text=JSON.stringify({...plan,input_sha256:sha256(raw)},null,2)+'\n';
 await mkdir(out,{recursive:true});await writeFile(resolve(out,'pilot-preaccess.json'),text);
 console.log(JSON.stringify({primary:plan.primary.length,controls:plan.controls.length,external_access_authorized:0,eligible_for_db:0,sha256:sha256(text)}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
