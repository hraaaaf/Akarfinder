#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const verifiedIn=arg("--verified"),unresolvedIn=arg("--unresolved"),evidenceRoot=arg("--evidence-root"),outDir=arg("--out-dir");
if(!verifiedIn||!unresolvedIn||!evidenceRoot||!outDir)throw new Error("missing args");
function canon(raw){
  const u=new URL(String(raw).trim());u.protocol="https:";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");u.hash="";
  for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";return u.toString();
}
function sha(s){return crypto.createHash("sha256").update(s).digest("hex")}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
fs.mkdirSync(outDir,{recursive:true});

const verified=[],vset=new Set();
for(const line of fs.readFileSync(verifiedIn,"utf8").split(/\r?\n/)){
  if(!line.trim())continue;const r=JSON.parse(line);r.canonical_url=canon(r.canonical_url);
  if(vset.has(r.canonical_url))throw new Error("duplicate base verified");vset.add(r.canonical_url);verified.push(r);
}
const unresolved=fs.readFileSync(unresolvedIn,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(canon);
const uset=new Set(unresolved);
if(verified.length!==180117||uset.size!==33875)throw new Error("base ledger v3 invariant");

const additions=[],byMethod={},byDomain={};
function add(url,domain,method,meta={}){
  const u=canon(url);if(!uset.has(u))return false;uset.delete(u);
  if(vset.has(u))throw new Error("already verified "+u);vset.add(u);
  additions.push({canonical_url:u,source_domain:domain,evidence:[method],verification_state:"existence_verified",db_ready:false,...meta});
  byMethod[method]=(byMethod[method]||0)+1;byDomain[domain]=(byDomain[domain]||0)+1;return true;
}
for(const file of walk(evidenceRoot)){
  if(file.endsWith(".jsonl")){
    for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
      if(!line.trim())continue;const r=JSON.parse(line);
      if(r.evidence_type==="commoncrawl_recent_index_presence")add(r.canonical_url,r.source_domain,"commoncrawl_recent",{cc_indexes:r.cc_indexes,latest_index:r.latest_index});
    }
  } else if(file.endsWith(".json")&&!file.endsWith("-summary.json")&&!file.endsWith("manifest.json")){
    let data;try{data=JSON.parse(fs.readFileSync(file,"utf8"))}catch{continue}
    if(Array.isArray(data))for(const r of data)if(r.http_status===200&&r.url&&r.domain)add(r.url,r.domain,"direct_http200",{final_url:r.final_url??null,evidence_file:path.basename(file)});
  }
}
const verified4=[...verified,...additions].sort((a,b)=>a.canonical_url.localeCompare(b.canonical_url));
const unresolved4=[...uset].sort();
if(verified4.length+unresolved4.length!==213992)throw new Error("population conservation");
const vb=verified4.map(x=>JSON.stringify(x)).join("\n")+"\n",ub=unresolved4.join("\n")+(unresolved4.length?"\n":"");
fs.writeFileSync(path.join(outDir,"existence-verified-v4.jsonl"),vb);
fs.writeFileSync(path.join(outDir,"unresolved-existence-v4.txt"),ub);
const unresolvedByDomain={};for(const u of unresolved4){const d=new URL(u).hostname.replace(/^www\./,"");unresolvedByDomain[d]=(unresolvedByDomain[d]||0)+1}
const verifiedByDomain={};for(const r of verified4)verifiedByDomain[r.source_domain]=(verifiedByDomain[r.source_domain]||0)+1;
const manifest={schema_version:"akarfinder-v4.11-pre-db-ledger-v4-20260927",base_verified_rows:verified.length,additions_rows:additions.length,additions_by_method:byMethod,additions_by_domain:byDomain,existence_verified_rows:verified4.length,unresolved_existence_rows:unresolved4.length,verified_by_domain:verifiedByDomain,unresolved_by_domain:unresolvedByDomain,verified_sha256:sha(vb),unresolved_sha256:sha(ub),database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false};
fs.writeFileSync(path.join(outDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");console.log(JSON.stringify(manifest,null,2));
