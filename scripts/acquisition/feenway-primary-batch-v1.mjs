#!/usr/bin/env node
// Offline evidence-only batch runner: no fetching, contacts, DB writes or publication.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePrimary} from './feenway-primary-parser-v1.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const MAX_ROWS=1000;
export function batchAudit(input){
  if(!Array.isArray(input)||input.length<1||input.length>MAX_ROWS)throw Error('batch_size_out_of_range');
  const keys=new Map(),rows=[];
  for(let i=0;i<input.length;i++){
    const item=input[i];
    const source=typeof item?.source==='string'?item.source:null;
    const identity=typeof (item?.identity||item?.source_key)==='string'?(item.identity||item.source_key):null;
    const feenway_id=Number.isSafeInteger(item?.feenway_id)?item.feenway_id:null;
    const id=source&&identity?source+'|'+identity:null;
    let parsed;
    try{
      parsed=parsePrimary({...item,identity});
      if(!parsed || parsed.eligible!==false)throw Error('invariant_violation');
    }catch{parsed={gate:'quarantine_parser_exception',issues:['parser_exception'],identity_verified:false,price_mad:null,surface_m2:null,city:null,district:null,transaction:null,price_period:null,surface_basis:null,fields_5_present:false,published_metadata:null};}
    const record={feenway_id,source,source_identity:identity,origin_url:typeof item?.original_url==='string'&&item.original_url.startsWith('https://')?item.original_url:null,
      primary_gate:parsed.gate,issues:parsed.issues||[],identity_verified:!!parsed.identity_verified,
      price_mad:parsed.price_mad??null,surface_m2:parsed.surface_m2??null,city:parsed.city??null,district:parsed.district??null,
      transaction:parsed.transaction??null,price_period:parsed.price_period??null,surface_basis:parsed.surface_basis??null,
      fields_5_present:!!parsed.fields_5_present,published_metadata:parsed.published_metadata??null,
      activity_verified:false,physically_unique_verified:false,reuse_rights_verified:false,eligible:false};
    rows.push(record);
    if(id){const group=keys.get(id)||[];group.push(i);keys.set(id,group);}
  }
  let repeats=0;
  for(const indexes of keys.values())if(indexes.length>1){
    repeats+=indexes.length;
    for(const i of indexes){rows[i].issues=[...new Set([...rows[i].issues,'same_source_identity_repeated_in_batch'])];rows[i].primary_gate='quarantine_identity_collision';}
  }
  const by_source={},by_gate={};
  for(const r of rows){by_source[r.source||'unknown']=(by_source[r.source||'unknown']||0)+1;by_gate[r.primary_gate]=(by_gate[r.primary_gate]||0)+1;}
  const summary={schema:'AKARFINDER_PRIMARY_BATCH_EVIDENCE_V1',rows:rows.length,by_source,by_gate,repeated_identity_rows:repeats,
    with_id:rows.filter(x=>x.identity_verified).length,with_price:rows.filter(x=>x.price_mad!==null).length,with_area:rows.filter(x=>x.surface_m2!==null).length,
    with_5_fields:rows.filter(x=>x.fields_5_present).length,commercially_certified:0,physically_unique_certified:0,reuse_rights_certified:0,db_writes:0,published:0};
  return {rows,summary};
}
async function main(args){
  const input=args.find(x=>x.startsWith('--input='))?.slice(8),out=args.find(x=>x.startsWith('--out='))?.slice(6);
  if(!input||!out)throw Error('required --input=... --out=...');
  const raw=await readFile(resolve(input),'utf8');if(raw.length>8_000_000)throw Error('input_oversize');
  const body=raw.trim();
  const arr=body.startsWith('[')?JSON.parse(body):body.split(/\r?\n/).map(JSON.parse);
  const audit=batchAudit(arr);
  const jsonl=audit.rows.map(x=>JSON.stringify(x)).join('\n')+'\n';
  audit.summary.output_sha256=sha(jsonl);
  await mkdir(dirname(resolve(out)),{recursive:true});
  await writeFile(resolve(out),jsonl);
  await writeFile(resolve(out+'.summary.json'),JSON.stringify(audit.summary,null,2)+'\n');
  process.stdout.write(JSON.stringify(audit.summary)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error('primary_batch_failed:'+e.message);process.exitCode=1;});
