#!/usr/bin/env node
// Offline RAW -> PULPER -> JSON mold. Private RAW content-addressed; never commit.
import {createReadStream} from 'node:fs';
import {open,mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePrimary} from './feenway-primary-parser-v1.mjs';
import {sha256,inspectRaw,toMold,verifyMold} from './listing-pulper-core-v1.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../');
const configPath=resolve(root,'data/molds/property-listing-v1.json');
const arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const input=arg('--input'),privateDir=arg('--raw-private-dir'),output=arg('--out');
if (!input||!privateDir||!output) {
  console.error('usage: node listing-pulper-v1.mjs --input=/private/in.jsonl --raw-private-dir=/private/raw --out=/private/report');
  process.exitCode=2;
} else {
  try{
    const mold=verifyMold(JSON.parse(await readFile(configPath,'utf8')));
    await mkdir(resolve(privateDir),{recursive:true,mode:0o700});
    await mkdir(resolve(output),{recursive:true});
    const target=resolve(output,'molds.jsonl');
    const tmp=target+'.partial';
    const handle=await open(tmp,'wx',0o600);
    let count=0,duplicates=0,rawCreated=0;
    const keys=new Set(),sourceVersions=new Map();
    const gates={};
    try{
      for await(const line of createInterface({input:createReadStream(resolve(input)),crlfDelay:Infinity})){
        if(!line.trim())continue;
        if(line.length>450000)throw new Error('raw_line_too_large');
        let row;
        try{row=JSON.parse(line)}catch{throw new Error('invalid_input_jsonl_line_'+(count+1))}
        const hash=sha256(line),path=resolve(privateDir,hash.slice(0,2),hash+'.json');
        await mkdir(dirname(path),{recursive:true,mode:0o700});
        try{const h=await open(path,'wx',0o600);await h.writeFile(line+'\n');await h.close();rawCreated++;}catch(e){if(e.code!=='EEXIST')throw e;duplicates++;}
        if(keys.has(hash))continue;
        keys.add(hash);
        const valid=inspectRaw(row).length===0;
        let parsed=null;
        if(valid)try{parsed=parsePrimary({source:row.source,identity:row.source_identity,original_url:row.source_url,final_url:row.final_url||row.source_url,title:row.title||'',text:row.markdown,published_date:row.source_published_at||null});}catch{parsed=null;}
        const m=toMold(row,parsed,mold);
        const ident=String(m.source_ref.source)+'|'+String(m.source_ref.source_identity);
        if(sourceVersions.has(ident)&&sourceVersions.get(ident)!==m.provenance.snapshot_sha256){m.status.issues.push('source_content_updated');m.status.gate='review_anomaly';}
        sourceVersions.set(ident,m.provenance.snapshot_sha256);
        gates[m.status.gate]=(gates[m.status.gate]||0)+1;
        await handle.write(JSON.stringify(m)+'\n');
        count++;
      }
    }finally{await handle.close()}
    await rename(tmp,target);
    const summary={schema:'AKARFINDER_RAW_PULPER_V1',processed_snapshots:count,duplicate_raw_events:duplicates,raw_private_created:rawCreated,distinct_source_ids:sourceVersions.size,gates,eligible_count:0,db_writes:0,published:0};
    await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify(summary));
  }catch(e){console.error('pulper_failed:'+e.message);process.exitCode=1;}
}