#!/usr/bin/env node
// N01 URL-only queue for public FR market and quartier landing pages. No requests, no DB.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE } from './feenway-sitemap-inventory-v1.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function buildQueue(rows,batchSize=50){
 if(!Number.isInteger(batchSize)||batchSize<1||batchSize>100)throw Error('invalid_batch_size');
 const seen=new Set(),queue=[];
 for(const kind of ['quartiers.xml','markets.xml']){
  for(const row of rows){
   if(row.sitemap!==kind||typeof row.url!=='string')continue;
   const u=new URL(row.url);
   if(u.origin!==BASE||u.search||u.hash||u.pathname.startsWith('/ar/')||u.pathname.startsWith('/en/'))continue;
   if(seen.has(u.href))continue;
   seen.add(u.href);
   queue.push({url:u.href,source_sitemap:kind,kind:kind.replace('.xml',''),status:'unvisited',listing_detail_requests:0});
  }
 }
 const batches=queue.map((x,i)=>({...x,batch:1+Math.floor(i/batchSize)}));
 const jsonl=batches.map(x=>JSON.stringify(x)).join('\n')+'\n';
 return {rows:batches,jsonl,summary:{schema:'AKARFINDER_FEENWAY_N01_LANDING_QUEUE_V1',total:batches.length,quartiers:batches.filter(x=>x.kind==='quartiers').length,markets:batches.filter(x=>x.kind==='markets').length,batch_size:batchSize,batches:Math.ceil(batches.length/batchSize),sha256:sha(jsonl),network_requests:0,db_writes:0}};
}
async function main(){
 const input=resolve(process.argv[2]||'.tmp/feenway-n01-surfaces/report.jsonl');
 const out=resolve(process.argv[3]||'.tmp/feenway-n01-surface-queue/queue.jsonl');
 const rows=(await readFile(input,'utf8')).trim().split('\n').map(x=>JSON.parse(x));
 const r=buildQueue(rows,50);
 if(r.rows.length<1)throw Error('empty_queue');
 await mkdir(dirname(out),{recursive:true});
 await writeFile(out,r.jsonl);
 await writeFile(out.replace(/\.jsonl$/,'.summary.json'),JSON.stringify(r.summary,null,2)+'\n');
 console.log(JSON.stringify(r.summary));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('feenway_queue_failed:'+e.message);process.exitCode=1;});
