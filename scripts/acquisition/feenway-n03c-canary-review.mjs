#!/usr/bin/env node
// FeenWay N03c: read-only archival evidence qualification. Never scrape or write DB.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export function parseJsonl(s){
 if(typeof s!=='string'||!s.trim())throw Error('empty_or_invalid_source');
 return s.trimEnd().split('\n').map((x,i)=>{try{let a=JSON.parse(x);if(!a||typeof a!=='object'||Array.isArray(a))throw Error('object_required');return a;}catch{throw Error('jsonl_line_'+(i+1));}});
}
const gates=new Set(['review_incomplete_or_conflicting','review_source_5of5_matches_feenway','review_economic_semantics','quarantine_source_unavailable']);
const econ=new Set(['price_is_per_square_meter','price_is_daily_short_stay','pas_de_porte_not_monthly_rent']);
const unsafe=['availability_verified','physically_unique_verified','rights_verified','publishable_certified','commercial_eligibility_certified','economic_interpretation_certified'];
export function qualify(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('empty_rows');
 const ids=new Set(),sources=new Set(),out=[];
 for(const r of rows){
  if(!Number.isSafeInteger(r.feenway_id)||r.feenway_id<=0||ids.has(r.feenway_id))throw Error('invalid_duplicate_feenway_id');
  ids.add(r.feenway_id);
  if(typeof r.original_source!=='string'||!/^[a-z0-9.-]+$/.test(r.original_source)||typeof r.original_identity!=='string'||!r.original_identity||!gates.has(r.quality_gate))throw Error('invalid_provenance_gate');
  const sourceKey=r.original_source+'|'+r.original_identity;
  if(sources.has(sourceKey))throw Error('duplicate_original_identity');
  sources.add(sourceKey);
  for(const flag of unsafe)if(r[flag]!==false)throw Error('unproven_gate_'+flag);
  if(r.explicit_economic_semantic_flag!=null&&!econ.has(r.explicit_economic_semantic_flag))throw Error('unknown_economic_flag');
  const retrieved=r.source_page_retrieved===true;
  if(retrieved===(r.quality_gate==='quarantine_source_unavailable'))throw Error('source_retrieval_gate_conflict');
  const matched=r.quality_gate==='review_source_5of5_matches_feenway';
  if(matched&&r.source_five_fields_strict!==true)throw Error('match_without_strict_fields');
  const warn=r.explicit_economic_semantic_flag??null;
  const date=typeof r.source_date_metadata==='string'&&r.source_date_metadata.trim()?r.source_date_metadata:null;
  if(date&&!Number.isFinite(Date.parse(date)))throw Error('invalid_source_date');
  const review=r.quality_gate==='quarantine_source_unavailable'?'quarantine_source_unavailable':warn?'review_economic_semantics':matched?'review_numeric_match_not_commercial':'review_incomplete_or_conflicting';
  out.push({
   feenway_id:r.feenway_id,source_portal:r.original_source,source_identity:r.original_identity,source_gate:r.quality_gate,review_queue:review,
   source_observations:{city:r.source_city??null,district:r.source_district??null,transaction:r.transaction??null,price_number_mad:r.source_price_mad??null,surface_number_m2:r.source_surface_m2??null,geographic_evidence:r.source_location_evidence??null,source_date_metadata:date},
   proof_flags:{strict_five_fields:r.source_five_fields_strict===true,numeric_match_to_feenway:matched,explicit_economic_warning:warn,
     economic_semantics_certified:false,fresh_certified:false,availability_certified:false,physical_uniqueness_certified:false,reuse_rights_certified:false},
   eligibility:'review_only',eligible_for_db:false,publishable:false
  });
 }
 out.sort((a,b)=>a.feenway_id-b.feenway_id);
 const count=f=>out.filter(f).length;
 const queues=Object.fromEntries([...new Set(out.map(x=>x.review_queue))].sort().map(k=>[k,count(x=>x.review_queue===k)]));
 const bySource=Object.fromEntries([...new Set(out.map(x=>x.source_portal))].sort().map(k=>[k,count(x=>x.source_portal===k)]));
 const jsonl=out.map(x=>JSON.stringify(x)).join('\n')+'\n';
 const summary={schema:'FEENWAY_N03C_HISTORICAL_81_REVIEW_V1',scope:'81 historical source pages only; no extrapolation to N01 URLs',rows:out.length,
  source_identifiers:sources.size,strict_five_fields:count(x=>x.proof_flags.strict_five_fields),
  numeric_matches:count(x=>x.proof_flags.numeric_match_to_feenway),
  numeric_matches_without_known_warning:count(x=>x.proof_flags.numeric_match_to_feenway&&!x.proof_flags.explicit_economic_warning),
  economic_warnings:count(x=>!!x.proof_flags.explicit_economic_warning),
  source_dates_metadata_only:count(x=>!!x.source_observations.source_date_metadata),
  queues,by_source:bySource,eligible_for_db:0,http_requests:0,db_writes:0,review_jsonl_sha256:sha256(jsonl)};
 return {summary,jsonl,out};
}
async function main(){
 const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>x.slice(2).split(/=(.*)/s).slice(0,2)));
 const source=resolve(args.source||'docs/data/feenway-canary81-source-fivefields-2026-10-26.jsonl');
 const output=resolve(args.out||'.tmp/feenway-n03c');
 const raw=await readFile(source,'utf8');
 if(args['expect-sha256']&&args['expect-sha256']!==sha256(raw))throw Error('input_integrity_failed');
 const {summary,jsonl}=qualify(parseJsonl(raw));
 await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'review-enriched.jsonl'),jsonl);
 await writeFile(resolve(output,'summary.json'),JSON.stringify({...summary,input_sha256:sha256(raw)},null,2)+'\n');
 console.log(JSON.stringify(summary));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
