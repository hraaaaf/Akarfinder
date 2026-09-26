#!/usr/bin/env tsx
/**
 * Merge bounded deep-public enrichment into Clean Corpus V4.
 * Offline only. Never changes classification or approved_for_import.
 */
import { createHash } from "node:crypto";
import { createReadStream, readdirSync, writeFileSync } from "node:fs";
import { createGunzip, gzipSync } from "node:zlib";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { canonicalizeSourceUrl } from "@/lib/openserp-ingestion/utils";

const BASE=process.env.BASE_V4_JSONL_GZ||"";
const DIR=process.env.DEEP_RESULTS_DIR||"";
const OUT=process.env.OUT_V4_JSONL_GZ||"";
if(!BASE||!DIR||!OUT) throw new Error("BASE_V4_JSONL_GZ, DEEP_RESULTS_DIR and OUT_V4_JSONL_GZ required");

const FIELDS=[
  "source_listing_id","title","description","price_mad","surface_m2","address",
  "published_at","city","district","bedrooms_count"
] as const;

async function readBase(path:string){
  const rows:any[]=[]; const byUrl=new Map<string,any>();
  const rl=createInterface({input:createReadStream(path).pipe(createGunzip()),crlfDelay:Infinity});
  for await(const line of rl){
    if(!line.trim()) continue;
    const row=JSON.parse(line);
    const u=typeof row.canonical_url==="string"?canonicalizeSourceUrl(row.canonical_url):null;
    if(!u) continue;
    row.canonical_url=u;
    row.field_sources ??= {};
    row.contradiction_flags ??= [];
    rows.push(row); byUrl.set(u,row);
  }
  return {rows,byUrl};
}
function empty(v:any){return v===null||v===undefined||v==="";}
function same(a:any,b:any){
  if(empty(a)||empty(b)) return empty(a)&&empty(b);
  if(typeof a==="number"&&typeof b==="number") return Math.abs(a-b)<=Math.max(1,Math.abs(a)*0.01);
  return String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
}
function addSource(row:any,field:string,source:string){
  const cur=row.field_sources[field];
  if(!cur) row.field_sources[field]=[source];
  else if(Array.isArray(cur)&&!cur.includes(source)) cur.push(source);
  else if(typeof cur==="string"&&cur!==source) row.field_sources[field]=[cur,source];
}
async function main(){
  const {rows,byUrl}=await readBase(BASE);
  let observations=0,matched=0,http200=0,filled=0,agreeing=0,conflicts=0,unmatched=0;
  const byDomain:Record<string,number>={};
  const files=readdirSync(DIR).filter(f=>/^deep-batch-.*\.json$/.test(f)).sort();
  for(const file of files){
    const arr=JSON.parse(await import("node:fs").then(m=>m.readFileSync(resolve(DIR,file),"utf8")));
    if(!Array.isArray(arr)) continue;
    for(const x of arr){
      observations++;
      const u=canonicalizeSourceUrl(String(x.url||x.final_url||""));
      if(!u){unmatched++;continue}
      const row=byUrl.get(u);
      if(!row){unmatched++;continue}
      matched++;
      if(Number(x.http_status)===200) http200++;
      const source=`deep_public:${String(x.domain||row.source_domain||"unknown")}`;
      byDomain[String(x.domain||row.source_domain||"unknown")]=(byDomain[String(x.domain||row.source_domain||"unknown")]??0)+1;
      row.enrichment_evidence ??=[];
      if(!row.enrichment_evidence.some((e:any)=>e?.source===source&&e?.url===u)){
        row.enrichment_evidence.push({source,url:u,http_status:x.http_status??null,final_url:x.final_url??null,robots_decision:x.robots_decision??null});
      }
      for(const field of FIELDS){
        const incoming=x[field];
        if(empty(incoming)) continue;
        const current=row[field];
        if(empty(current)){row[field]=incoming;addSource(row,field,source);filled++;continue}
        if(same(current,incoming)){addSource(row,field,source);agreeing++;continue}
        const flag=`enrichment_conflict:${field}`;
        if(!row.contradiction_flags.includes(flag)) row.contradiction_flags.push(flag);
        conflicts++;
      }
      // Safety invariants: enrichment may never promote/import or rewrite classification.
      row.approved_for_import=false;
    }
  }
  rows.sort((a,b)=>String(a.canonical_url).localeCompare(String(b.canonical_url)));
  const body=Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+"\n");
  const gz=gzipSync(body,{level:9});
  writeFileSync(OUT,gz);
  const manifest={
    schema_version:"akarfinder-clean-corpus-v4-enrichment-merge-v1",
    rows:rows.length,files:files.length,observations,matched,unmatched,http_200:http200,
    filled_fields:filled,agreeing_existing_fields:agreeing,contradictions:conflicts,
    by_domain:byDomain,
    classifications:Object.fromEntries([...new Set(rows.map(r=>r.classification))].sort().map(k=>[k,rows.filter(r=>r.classification===k).length])),
    approved_for_import_rows:rows.filter(r=>r.approved_for_import===true).length,
    database_access:0,database_writes:0,
    sha256_gzip:createHash("sha256").update(gz).digest("hex")
  };
  writeFileSync(OUT.replace(/\.jsonl\.gz$/,"-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify(manifest,null,2));
}
void main().catch(e=>{console.error(e);process.exit(1)});
