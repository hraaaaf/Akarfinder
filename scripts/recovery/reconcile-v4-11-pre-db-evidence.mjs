#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const packDir=arg("--pack-dir"), freezeDir=arg("--freeze-dir"), saroutFile=arg("--sarout-sitemap"), marocFile=arg("--marocimmo-sitemap"), ccFile=arg("--mubawab-cc"), outDir=arg("--out-dir");
if(!packDir||!freezeDir||!saroutFile||!marocFile||!ccFile||!outDir) throw new Error("missing args");
const cutoff=new Date("2026-08-28T00:00:00Z");

function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:";
  u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
  u.hash="";
  for(const k of [...u.searchParams.keys()]) if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k)) u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function csvParse(line){
  const out=[];let cur="";let q=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='"'&&line[i+1]==='"'){cur+='"';i++}else if(ch==='"')q=false;else cur+=ch}else{if(ch==='"')q=true;else if(ch===','){out.push(cur);cur=""}else cur+=ch}}out.push(cur);return out;
}
async function* gzJsonl(file){
  const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
  for await(const line of rl) if(line.trim()) yield JSON.parse(line);
}
function loadUrlSet(file){return new Set(fs.readFileSync(file,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(canon))}
function recent(v){if(!v)return false;const d=new Date(v);return Number.isFinite(d.getTime())&&d>=cutoff}
function putField(rec,k,v,source){
  if(v===null||v===undefined||v==="")return;
  if(rec.fields[k]===undefined){rec.fields[k]=v;rec.field_sources[k]=source}
}
function bump(m,k){m[k]=(m[k]||0)+1}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}

fs.mkdirSync(outDir,{recursive:true});
const rows=new Map();
const chunkDir=path.join(packDir,"chunks");
for(const name of fs.readdirSync(chunkDir).filter(n=>n.endsWith(".csv")).sort()){
  const rl=readline.createInterface({input:fs.createReadStream(path.join(chunkDir,name)),crlfDelay:Infinity});
  let first=true;
  for await(const line of rl){
    if(first){first=false;continue}
    if(!line.trim())continue;
    const [domain,,listingUrl,rawJson]=csvParse(line);
    const raw=JSON.parse(rawJson), u=canon(listingUrl);
    const rec={canonical_url:u,source_domain:domain,fields:{},field_sources:{},evidence:new Set(),contradiction_flags:raw.contradiction_flags||[]};
    for(const k of ["title","city","property_type","transaction_type","price_mad","surface_m2","district","bedrooms_count","published_at"])putField(rec,k,raw[k],"v4.11_core");
    if((raw.deep_http_statuses||[]).includes(200))rec.evidence.add("direct_http200");
    rows.set(u,rec);
  }
}
if(rows.size!==213992)throw new Error("remaining rows "+rows.size);

const sarout=loadUrlSet(saroutFile), maroc=loadUrlSet(marocFile);
for(const rec of rows.values()){
  if(rec.source_domain==="sarout.ma"&&sarout.has(rec.canonical_url))rec.evidence.add("official_sitemap_recent");
  if(rec.source_domain==="marocimmo.com"&&maroc.has(rec.canonical_url))rec.evidence.add("official_sitemap_recent");
}
for(const line of fs.readFileSync(ccFile,"utf8").split(/\r?\n/)){
  if(!line.trim())continue;
  const r=JSON.parse(line),u=canon(r.canonical_url);
  if(rows.has(u))rows.get(u).evidence.add("commoncrawl_recent");
}

const pl=new Map();
for await(const r of gzJsonl(path.join(freezeDir,"property_listings.jsonl.gz")))pl.set(r.id,r);
for await(const r of gzJsonl(path.join(freezeDir,"listing_sources.jsonl.gz"))){
  const u=canon(r.listing_url);const rec=rows.get(u);if(!rec)continue;
  if(r.is_active===true&&recent(r.last_seen_at))rec.evidence.add("listing_source_active_recent");
  const p=pl.get(r.property_listing_id)||{};
  for(const k of ["title","city","property_type","transaction_type","price_mad","surface_m2","bedrooms_count","description_snippet"])putField(rec,k,p[k],"freeze_property_listing");
}
for await(const r of gzJsonl(path.join(freezeDir,"minimal_live_search_documents_v1.jsonl.gz"))){
  const rec=rows.get(canon(r.canonical_url));if(!rec)continue;
  if(recent(r.updated_at))rec.evidence.add("minimal_live_recent");
  for(const k of ["title","city","property_type","transaction_type","price_mad","surface_m2","district"])putField(rec,k,r[k],"freeze_minimal_live");
}
for await(const r of gzJsonl(path.join(freezeDir,"thin_index_search_documents.jsonl.gz"))){
  const rec=rows.get(canon(r.canonical_url));if(!rec)continue;
  if(r.freshness_status==="fresh_confirmed"&&recent(r.updated_at))rec.evidence.add("thin_fresh_confirmed_recent");
  const map={title:"title",normalized_city:"city",normalized_property_type:"property_type",normalized_intent:"transaction_type",normalized_price_mad:"price_mad",normalized_surface_m2:"surface_m2"};
  for(const [src,k] of Object.entries(map))putField(rec,k,r[src],"freeze_thin");
}
for await(const r of gzJsonl(path.join(freezeDir,"listing_representations.jsonl.gz"))){
  const rec=rows.get(canon(r.canonical_url));if(!rec)continue;
  if(["live_minimal","fresh_confirmed","active"].includes(r.freshness_status)&&recent(r.updated_at))rec.evidence.add("representation_recent");
  for(const k of ["title","city","property_type","transaction_type","price_mad","surface_m2","district"])putField(rec,k,r[k],"freeze_representation");
}

const verifiedPath=path.join(outDir,"existence-verified.jsonl");
const unresolvedPath=path.join(outDir,"unresolved-existence.txt");
const fieldReadyPath=path.join(outDir,"field-ready-pre-identity.jsonl");
const verifiedOut=fs.createWriteStream(verifiedPath), unresolvedOut=fs.createWriteStream(unresolvedPath), readyOut=fs.createWriteStream(fieldReadyPath);
const verifiedByDomain={}, unresolvedByDomain={}, readyByDomain={}, evidenceCounts={};
let verified=0,unresolved=0,ready=0;
for(const rec of [...rows.values()].sort((a,b)=>a.canonical_url.localeCompare(b.canonical_url))){
  const ev=[...rec.evidence].sort();
  for(const e of ev)bump(evidenceCounts,e);
  const exists=ev.length>0;
  const core4=["title","city","property_type","transaction_type"].every(k=>rec.fields[k]!==undefined&&rec.fields[k]!==null&&rec.fields[k]!=="");
  if(exists){
    verified++;bump(verifiedByDomain,rec.source_domain);
    verifiedOut.write(JSON.stringify({canonical_url:rec.canonical_url,source_domain:rec.source_domain,evidence:ev,db_ready:false})+"\n");
  }else{
    unresolved++;bump(unresolvedByDomain,rec.source_domain);unresolvedOut.write(rec.canonical_url+"\n");
  }
  if(exists&&core4&&rec.contradiction_flags.length===0){
    ready++;bump(readyByDomain,rec.source_domain);
    readyOut.write(JSON.stringify({canonical_url:rec.canonical_url,source_domain:rec.source_domain,fields:rec.fields,field_sources:rec.field_sources,evidence:ev,identity_gate:"PENDING",approved_for_import:false})+"\n");
  }
}
await Promise.all([new Promise(r=>verifiedOut.end(r)),new Promise(r=>unresolvedOut.end(r)),new Promise(r=>readyOut.end(r))]);

if(verified!==163247)throw new Error("verified "+verified);
if(unresolved!==50745)throw new Error("unresolved "+unresolved);
if(ready!==17238)throw new Error("ready pre-identity "+ready);

const manifest={
  schema_version:"akarfinder-v4.11-pre-db-reconciled-ledger-20260927",
  recency_cutoff:"2026-08-28T00:00:00Z",
  input_rows:213992,
  existence_verified_rows:verified,
  unresolved_existence_rows:unresolved,
  product_core4_ready_pre_identity_rows:ready,
  db_ready_rows:0,
  verified_by_domain:verifiedByDomain,
  unresolved_by_domain:unresolvedByDomain,
  pre_identity_ready_by_domain:readyByDomain,
  evidence_counts:evidenceCounts,
  rule:"DB import remains forbidden until existence, product fields, identity/contradiction and explicit cohort approval all pass.",
  outputs:{
    existence_verified:{file:"existence-verified.jsonl",sha256:sha(verifiedPath)},
    unresolved_existence:{file:"unresolved-existence.txt",sha256:sha(unresolvedPath)},
    field_ready_pre_identity:{file:"field-ready-pre-identity.jsonl",sha256:sha(fieldReadyPath)}
  },
  database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false
};
fs.writeFileSync(path.join(outDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
