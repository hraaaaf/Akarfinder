#!/usr/bin/env tsx
import { writeFileSync } from "node:fs";
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
  {table:"discovery_candidates",expected:321173,pk:"id"},
  {table:"listing_representations",expected:143121,pk:"id"},
  {table:"source_offer_seeds",expected:78110,pk:"id"},
  {table:"thin_index_search_documents",expected:77123,pk:"seed_id"},
  {table:"minimal_live_search_documents_v1",expected:74846,pk:"id"},
  {table:"mubawab_listing_corpus_v1",expected:37420,pk:"source_listing_id"},
  {table:"source_offer_observations",expected:19908,pk:"id"},
  {table:"listing_sources",expected:19621,pk:"id"},
  {table:"property_listings",expected:19616,pk:"id"},
  {table:"property_cluster_members",expected:7802,pk:"id"},
  {table:"property_clusters",expected:7796,pk:"id"},
  {table:"source_freshness_state",expected:35,pk:"source_domain"},
  {table:"source_offer_lifecycle_signals",expected:4,pk:"id"},
  {table:"listing_observation_history",expected:0,pk:"observation_key"},
  {table:"mubawab_public_minimal_index_v1",expected:0,pk:"representation_id"},
] as const;

type ManifestRow={
  table:string; primary_key:string; expected_rows:number; exported_rows:number; pages:number;
  jsonl_bytes:number; gzip_bytes:number; sha256_jsonl:string; sha256_gzip:string;
  first_pk:string|null; last_pk:string|null;
};

function filterValue(v:unknown){ return encodeURIComponent(String(v)); }

async function fetchPage(table:string,pk:string,cursor:string|null){
  const qs=new URLSearchParams();
  qs.set("select","*");
  qs.set("order",`${pk}.asc`);
  qs.set("limit",String(PAGE));
  if(cursor!==null) qs.set(pk,`gt.${cursor}`);
  const url=`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${qs.toString()}`;
  for(let attempt=1;attempt<=3;attempt++){
    const r=await fetch(url,{
      headers:{
        apikey:KEY,
        Authorization:`Bearer ${KEY}`,
        Accept:"application/json"
      }
    });
    if(r.ok){
      const x=await r.json();
      if(!Array.isArray(x)) throw new Error(`${table}: non-array response`);
      return x;
    }
    const body=(await r.text()).slice(0,500);
    if(attempt===3) throw new Error(`${table} cursor=${cursor??"<start>"}: HTTP ${r.status}: ${body}`);
    await new Promise(r=>setTimeout(r,1000*attempt));
  }
  return [];
}

async function exportTable(table:string,expected:number,pk:string):Promise<ManifestRow>{
  const chunks:string[]=[];
  let exported=0, pages=0, cursor:string|null=null, firstPk:string|null=null, lastPk:string|null=null;

  while(true){
    const rows=await fetchPage(table,pk,cursor);
    pages++;
    if(rows.length===0) break;

    for(const row of rows){
      if(row[pk]===undefined||row[pk]===null) throw new Error(`${table}: null/missing primary key ${pk}`);
      const pkv=String(row[pk]);
      if(firstPk===null) firstPk=pkv;
      lastPk=pkv;
      chunks.push(JSON.stringify(row));
    }

    exported+=rows.length;
    const next=String(rows[rows.length-1][pk]);
    if(cursor!==null && next===cursor) throw new Error(`${table}: cursor did not advance at ${cursor}`);
    cursor=next;

    if(rows.length<PAGE) break;
    if(exported>expected+PAGE*2) throw new Error(`${table}: runaway keyset pagination (${exported} > expected ${expected})`);
  }

  if(exported!==expected) throw new Error(`${table}: row count drift expected=${expected} exported=${exported}`);

  const body=chunks.length?chunks.join("\n")+"\n":"";
  const raw=Buffer.from(body,"utf8");
  const gz=gzipSync(raw,{level:9});
  writeFileSync(resolve(OUT,`${table}.jsonl`),raw);
  writeFileSync(resolve(OUT,`${table}.jsonl.gz`),gz);

  return {
    table,primary_key:pk,expected_rows:expected,exported_rows:exported,pages,
    jsonl_bytes:raw.length,gzip_bytes:gz.length,
    sha256_jsonl:createHash("sha256").update(raw).digest("hex"),
    sha256_gzip:createHash("sha256").update(gz).digest("hex"),
    first_pk:firstPk,last_pk:lastPk
  };
}

async function main(){
  await mkdir(OUT,{recursive:true});
  const started_at=new Date().toISOString();
  const rows:ManifestRow[]=[];

  for(const x of TABLES){
    const r=await exportTable(x.table,x.expected,x.pk);
    rows.push(r);
    console.log(JSON.stringify(r));
  }

  const finished_at=new Date().toISOString();
  const total=rows.reduce((a,b)=>a+b.exported_rows,0);
  if(total!==806575) throw new Error(`total mismatch: ${total}`);

  const manifest={
    schema_version:"akarfinder-supabase-freeze-v2-keyset",
    project_ref:"kusfiyimwvxblvsrhaes",
    started_at,finished_at,
    scope:"public real-estate/index/source tables only; excludes auth, leads, user/personal tables",
    pagination:"primary-key keyset; no OFFSET",
    read_only:true,database_writes:0,
    total_rows:total,table_count:rows.length,tables:rows
  };
  writeFileSync(resolve(OUT,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify({freeze_complete:true,total_rows:total,table_count:rows.length,started_at,finished_at},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
