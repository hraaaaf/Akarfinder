#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
const core=arg("--core"), imported=arg("--imported"), outDir=arg("--out-dir"), summaryPath=arg("--summary");
const chunkSize=Number(arg("--chunk-size")||10000);
if(!core||!imported||!outDir||!summaryPath) throw new Error("missing required args");

const CORE_SHA="e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953";
const IMPORTED_SHA="18b810d3eb07e0fb293cc815d6f4c5506126fa1ed3926b6f4fc14abbd67fb695";
const EXPECTED_REMAINING=213992;

function sha256File(file){
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function csvCell(v){
  const s=v==null?"":String(v);
  return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
async function* gzJsonl(file){
  const rl=readline.createInterface({input:fs.createReadStream(file).pipe(zlib.createGunzip()),crlfDelay:Infinity});
  for await(const line of rl) if(line.trim()) yield JSON.parse(line);
}
function loadJsonlUrls(file){
  const urls=new Set();
  for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
    if(!line.trim()) continue;
    const r=JSON.parse(line);
    urls.add(r.listing_url||r.canonical_url);
  }
  return urls;
}
function bump(m,k){m[k]=(m[k]||0)+1}

if(sha256File(core)!==CORE_SHA) throw new Error("core SHA mismatch");
if(sha256File(imported)!==IMPORTED_SHA) throw new Error("imported cohort SHA mismatch");

const importedUrls=loadJsonlUrls(imported);
if(importedUrls.size!==8367) throw new Error("expected 8367 imported URLs");

fs.mkdirSync(outDir,{recursive:true});
for(const n of fs.readdirSync(outDir)) fs.rmSync(path.join(outDir,n),{recursive:true,force:true});

let fd=null, chunkRows=0, total=0, chunkIndex=0;
let currentFile=null, firstUrl=null, lastUrl=null;
const chunks=[], byDomain={}, deepEvidence={}, fieldTiers={};
let contradictionRows=0, approvedRows=0;

function closeChunk(){
  if(fd===null) return;
  fs.closeSync(fd);
  fd=null;
  const full=path.join(outDir,currentFile);
  chunks.push({
    file:currentFile,
    rows:chunkRows,
    bytes:fs.statSync(full).size,
    sha256:sha256File(full),
    first_url:firstUrl,
    last_url:lastUrl
  });
  chunkRows=0; firstUrl=null; lastUrl=null; currentFile=null;
}
function openChunk(){
  currentFile=`bulk-v4.11-remaining-${String(chunkIndex).padStart(3,"0")}.csv`;
  chunkIndex++;
  fd=fs.openSync(path.join(outDir,currentFile),"w");
  fs.writeSync(fd,"source_name,source_url,listing_url,raw_json\n","utf8");
}

for await(const r of gzJsonl(core)){
  if(r.scope_eligible!==true) continue;
  if(importedUrls.has(r.canonical_url)) continue;

  if(fd===null || chunkRows>=chunkSize){ closeChunk(); openChunk(); }

  const statuses=Array.isArray(r.deep_http_statuses)?r.deep_http_statuses:[];
  const evidence=statuses.includes(200)?"http200":statuses.includes(503)?"http503_only":statuses.includes(0)?"http0_only":"no_deep";
  bump(deepEvidence,evidence);

  const fieldNames=["title","description","price_mad","surface_m2","address","published_at","city","district","bedrooms_count","source_listing_id"];
  const present=fieldNames.filter(k=>r[k]!==null&&r[k]!==undefined&&r[k]!=="").length;
  bump(fieldTiers,present===0?"no_enriched_fields":present<=3?"1_3_fields":present<=7?"4_7_fields":"8_10_fields");

  if(Array.isArray(r.contradiction_flags)&&r.contradiction_flags.length) contradictionRows++;
  if(r.approved_for_import===true) approvedRows++;
  bump(byDomain,r.source_domain);

  const payload={
    ...r,
    recovery_schema:"akarfinder-clean-corpus-v4.11",
    staging_state:"eligible_not_promoted",
    already_promoted_to_property_listings:false,
    source_core_artifact_id:10910779576,
    source_core_gzip_sha256:CORE_SHA,
    excluded_imported_g6_artifact_id:10918695596,
    excluded_imported_g6_sha256:IMPORTED_SHA
  };
  const line=[
    csvCell(r.source_domain),
    csvCell("https://"+r.source_domain),
    csvCell(r.canonical_url),
    csvCell(JSON.stringify(payload))
  ].join(",")+"\n";
  fs.writeSync(fd,line,"utf8");
  if(firstUrl===null) firstUrl=r.canonical_url;
  lastUrl=r.canonical_url;
  chunkRows++; total++;
}
closeChunk();

if(total!==EXPECTED_REMAINING) throw new Error(`expected ${EXPECTED_REMAINING}, got ${total}`);
if(chunks.length!==22) throw new Error(`expected 22 chunks, got ${chunks.length}`);
if(chunks.slice(0,-1).some(c=>c.rows!==10000)) throw new Error("non-final chunk row count mismatch");
if(chunks.at(-1).rows!==3992) throw new Error("final chunk must contain 3992 rows");
if(contradictionRows!==0) throw new Error(`unexpected contradiction rows: ${contradictionRows}`);
if(approvedRows!==0) throw new Error(`approved_for_import must stay false; got ${approvedRows}`);

const payloadDigest=crypto.createHash("sha256")
  .update(chunks.map(c=>c.sha256).join("\n"))
  .digest("hex");

const summary={
  schema_version:"akarfinder-v4.11-bulk-staging-pack-20260927",
  source_core_artifact_id:10910779576,
  source_core_gzip_sha256:CORE_SHA,
  excluded_already_imported_artifact_id:10918695596,
  excluded_already_imported_sha256:IMPORTED_SHA,
  source_scope_eligible_rows:222359,
  already_imported_g6_safe_rows:8367,
  remaining_rows:total,
  chunk_size:chunkSize,
  chunks_count:chunks.length,
  chunks,
  payload_digest_sha256:payloadDigest,
  by_domain:byDomain,
  deep_evidence:deepEvidence,
  enrichment_field_tiers:fieldTiers,
  contradiction_rows:contradictionRows,
  approved_for_import_rows:approvedRows,
  target_neon:{
    project_id:"ancient-violet-43534870",
    branch_id:"br-cold-mouse-b2a50yaa",
    database:"AkarFinder",
    staging_tables:["scrape_runs","raw_listings"],
    expected_pre_stage:{scrape_runs:0,raw_listings:0,property_listings:8544,listing_sources:8544},
    expected_post_stage:{scrape_runs:1,raw_listings:213992,property_listings:8544,listing_sources:8544}
  },
  doctrine:"Stage all remaining scope-eligible representations durably in raw_listings. Do not promote to property_listings without separate cohort certification.",
  database_access:0,
  database_writes:0,
  production_neon_writes:0,
  vercel_deployment:false
};
fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
