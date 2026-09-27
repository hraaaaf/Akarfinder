#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const verifiedIn=arg("--verified"),unresolvedIn=arg("--unresolved"),evidenceRoot=arg("--evidence-root"),outDir=arg("--out-dir");
if(!verifiedIn||!unresolvedIn||!evidenceRoot||!outDir)throw new Error("missing args");

function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");u.hash="";
  for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function sha(s){return crypto.createHash("sha256").update(s).digest("hex")}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
fs.mkdirSync(outDir,{recursive:true});

const verified=[],vset=new Set();
for(const line of fs.readFileSync(verifiedIn,"utf8").split(/\r?\n/)){
  if(!line.trim())continue;
  const r=JSON.parse(line);r.canonical_url=canon(r.canonical_url);
  if(vset.has(r.canonical_url))throw new Error("duplicate base verified");
  vset.add(r.canonical_url);verified.push(r);
}
if(verified.length!==170961)throw new Error("base verified "+verified.length);

const unresolved=fs.readFileSync(unresolvedIn,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(canon);
const uset=new Set(unresolved);
if(uset.size!==43031)throw new Error("base unresolved "+uset.size);

const additions=[];const byMethod={};const byDomain={};
function add(url,domain,method,meta={}){
  const u=canon(url);
  if(!uset.has(u))return false;
  uset.delete(u);
  if(vset.has(u))throw new Error("already verified "+u);
  vset.add(u);
  additions.push({canonical_url:u,source_domain:domain,evidence:[method],verification_state:"existence_verified",db_ready:false,...meta});
  byMethod[method]=(byMethod[method]||0)+1;byDomain[domain]=(byDomain[domain]||0)+1;
  return true;
}

for(const file of walk(evidenceRoot)){
  if(file.endsWith(".jsonl")){
    for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
      if(!line.trim())continue;
      const r=JSON.parse(line);
      if(r.evidence_type==="commoncrawl_recent_index_presence"){
        add(r.canonical_url,r.source_domain,"commoncrawl_recent",{cc_indexes:r.cc_indexes,latest_index:r.latest_index});
      }
    }
  }else if(file.endsWith(".json")&&!file.endsWith("-summary.json")&&!file.endsWith("manifest.json")&&!file.endsWith("-summary.json")){
    let data;try{data=JSON.parse(fs.readFileSync(file,"utf8"))}catch{continue}
    if(Array.isArray(data)){
      for(const r of data){
        if(r.http_status===200&&r.url&&r.domain){
          add(r.url,r.domain,"direct_http200",{final_url:r.final_url??null,evidence_file:path.basename(file)});
        }
      }
    }
  }
}

const expectedMethods={commoncrawl_recent:4977,direct_http200:4179};
for(const [k,n] of Object.entries(expectedMethods))if(byMethod[k]!==n)throw new Error(k+" additions "+byMethod[k]+" != "+n);
if(additions.length!==9156)throw new Error("additions "+additions.length);
const verified3=[...verified,...additions].sort((a,b)=>a.canonical_url.localeCompare(b.canonical_url));
const unresolved3=[...uset].sort();
if(verified3.length!==180117)throw new Error("verified v3 "+verified3.length);
if(unresolved3.length!==33875)throw new Error("unresolved v3 "+unresolved3.length);

const vb=verified3.map(x=>JSON.stringify(x)).join("\n")+"\n";
const ub=unresolved3.join("\n")+"\n";
fs.writeFileSync(path.join(outDir,"existence-verified-v3.jsonl"),vb);
fs.writeFileSync(path.join(outDir,"unresolved-existence-v3.txt"),ub);
const unresolvedByDomain={};for(const u of unresolved3){const d=new URL(u).hostname.replace(/^www\./,"");unresolvedByDomain[d]=(unresolvedByDomain[d]||0)+1}
const verifiedByDomain={};for(const r of verified3)verifiedByDomain[r.source_domain]=(verifiedByDomain[r.source_domain]||0)+1;
const manifest={schema_version:"akarfinder-v4.11-pre-db-ledger-v3-20260927",base_verified_rows:170961,additions_rows:additions.length,additions_by_method:byMethod,additions_by_domain:byDomain,existence_verified_rows:verified3.length,unresolved_existence_rows:unresolved3.length,verified_by_domain:verifiedByDomain,unresolved_by_domain:unresolvedByDomain,verified_sha256:sha(vb),unresolved_sha256:sha(ub),database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false};
fs.writeFileSync(path.join(outDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
