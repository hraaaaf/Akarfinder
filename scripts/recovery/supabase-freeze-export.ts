#!/usr/bin/env tsx
import { createWriteStream, readFileSync, writeFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

const SUPABASE_URL=(process.env.SUPABASE_URL||"").replace(/\/$/,"");
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const OUT=resolve(process.env.FREEZE_OUT_DIR||".tmp/supabase-freeze");
const PAGE=1000;

if(!SUPABASE_URL||!KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");

const TABLES=[
  ["discovery_candidates",321173],
  ["listing_representations",143121],
  ["source_offer_seeds",78110],
  ["thin_index_search_documents",77123],
  ["minimal_live_search_documents_v1",74846],
  ["mubawab_listing_corpus_v1",37420],
  ["source_offer_observations",19908],
  ["listing_sources",19621],
  ["property_listings",19616],
  ["property_cluster_members",7802],
  ["property_clusters",7796],
  ["source_freshness_state",35],
  ["source_offer_lifecycle_signals",4],
  ["listing_observation_history",0],
  ["mubawab_public_minimal_index_v1",0],
] as const;

type ManifestRow={
  table:string; expected_rows:number; exported_rows:number; pages:number;
  jsonl_bytes:number; gzip_bytes:number; sha256_jsonl:string; sha256_gzip:string;
};

async function fetchPage(table:string,start:number,end:number){
  const url=`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?select=*`;
  const r=await fetch(url,{
    headers:{
      apikey:KEY,
      Authorization:`Bearer ${KEY}`,
      Range:`${start}-${end}`,
      "Range-Unit":"items",
      Accept:"application/json"
    }
  });
  if(!r.ok) throw new Error(`${table} ${start}-${end}: HTTP ${r.status}: ${(await r.text()).slice(0,500)}`);
  const x=await r.json();
  if(!Array.isArray(x)) throw new Error(`${table}: non-array response`);
  return x;
}

async function exportTable(table:string,expected:number):Promise<ManifestRow>{
  const chunks:string[]=[];
  let exported=0, pages=0;
  for(let start=0;;start+=PAGE){
    const rows=await fetchPage(table,start,start+PAGE-1);
    pages++;
    for(const row of rows) chunks.push(JSON.stringify(row));
    exported+=rows.length;
    if(rows.length<PAGE) break;
    if(exported>expected+PAGE*2) throw new Error(`${table}: runaway pagination (${exported} > expected ${expected})`);
  }
  if(exported!==expected) throw new Error(`${table}: row count drift expected=${expected} exported=${exported}`);

  const body=chunks.length?chunks.join("\n")+"\n":"";
  const raw=Buffer.from(body,"utf8");
  const gz=gzipSync(raw,{level:9});
  const rawPath=resolve(OUT,`${table}.jsonl`);
  const gzPath=resolve(OUT,`${table}.jsonl.gz`);
  writeFileSync(rawPath,raw);
  writeFileSync(gzPath,gz);
  return {
    table,expected_rows:expected,exported_rows:exported,pages,
    jsonl_bytes:raw.length,gzip_bytes:gz.length,
    sha256_jsonl:createHash("sha256").update(raw).digest("hex"),
    sha256_gzip:createHash("sha256").update(gz).digest("hex")
  };
}

async function main(){
  await mkdir(OUT,{recursive:true});
  const started_at=new Date().toISOString();
  const rows:ManifestRow[]=[];
  for(const [table,expected] of TABLES){
    const r=await exportTable(table,expected);
    rows.push(r);
    console.log(JSON.stringify(r));
  }
  const finished_at=new Date().toISOString();
  const total=rows.reduce((a,b)=>a+b.exported_rows,0);
  if(total!==806575) throw new Error(`total mismatch: ${total}`);
  const manifest={
    schema_version:"akarfinder-supabase-freeze-v1",
    project_ref:"kusfiyimwvxblvsrhaes",
    started_at,finished_at,
    scope:"public real-estate/index/source tables only; excludes auth, leads, user/personal tables",
    read_only:true,database_writes:0,
    total_rows:total,
    table_count:rows.length,
    tables:rows
  };
  writeFileSync(resolve(OUT,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify({freeze_complete:true,total_rows:total,table_count:rows.length,started_at,finished_at},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
