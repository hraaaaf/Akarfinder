#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import readline from "node:readline";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const packDir=arg("--pack-dir"), saroutFile=arg("--sarout-sitemap"), marocFile=arg("--marocimmo-sitemap"), outDir=arg("--out-dir");
if(!packDir||!saroutFile||!marocFile||!outDir) throw new Error("missing args");

function canon(raw){
  const u=new URL(String(raw).trim());
  u.hostname=u.hostname.replace(/^www\./i,"").toLowerCase();
  u.hash="";
  if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,"");
  return u.toString();
}
function csvParse(line){
  const out=[];let cur="";let q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(q){
      if(ch==='"'&&line[i+1]==='"'){cur+='"';i++}
      else if(ch==='"')q=false;
      else cur+=ch;
    }else{
      if(ch==='"')q=true;
      else if(ch===','){out.push(cur);cur=""}
      else cur+=ch;
    }
  }
  out.push(cur);return out;
}
function loadSet(file){return new Set(fs.readFileSync(file,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(canon))}
function bump(m,k){m[k]=(m[k]||0)+1}
function ensureDir(p){fs.mkdirSync(p,{recursive:true})}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}

const sarout=loadSet(saroutFile), maroc=loadSet(marocFile);
ensureDir(outDir);ensureDir(path.join(outDir,"unresolved"));
const verifiedPath=path.join(outDir,"existence-verified.jsonl");
const verified=createWriteStream(verifiedPath,{encoding:"utf8"});
const unresolvedAllPath=path.join(outDir,"unresolved-all.txt");
const unresolvedAll=createWriteStream(unresolvedAllPath,{encoding:"utf8"});
const unresolvedWriters=new Map();
const byDomain={}, unresolvedByDomain={}, evidence={};
let total=0,verifiedN=0,unresolvedN=0;

function uw(domain){
  if(!unresolvedWriters.has(domain)){
    const f=path.join(outDir,"unresolved",domain.replace(/[^a-z0-9.-]/gi,"_")+".txt");
    unresolvedWriters.set(domain,createWriteStream(f,{encoding:"utf8"}));
  }
  return unresolvedWriters.get(domain);
}

const chunkDir=path.join(packDir,"chunks");
for(const name of fs.readdirSync(chunkDir).filter(n=>n.endsWith(".csv")).sort()){
  const rl=readline.createInterface({input:createReadStream(path.join(chunkDir,name)),crlfDelay:Infinity});
  let header=true;
  for await(const line of rl){
    if(header){header=false;continue}
    if(!line.trim())continue;
    const [source_name,,listing_url,raw_json]=csvParse(line);
    const r=JSON.parse(raw_json);
    total++;bump(byDomain,source_name);
    const url=canon(listing_url);
    const statuses=Array.isArray(r.deep_http_statuses)?r.deep_http_statuses:[];
    const direct=statuses.includes(200);
    const sitemap=(source_name==="sarout.ma"&&sarout.has(url))||(source_name==="marocimmo.com"&&maroc.has(url));
    if(direct||sitemap){
      verifiedN++;
      const method=direct&&sitemap?"http200+sitemap":direct?"http200_only":"sitemap_only";
      bump(evidence,method);
      verified.write(JSON.stringify({
        canonical_url:url,source_domain:source_name,
        verification_state:"existence_verified",
        verification_method:method,
        db_ready:false,
        reason_db_not_ready:"field/product readiness must still pass before DB",
        database_access:0,database_writes:0
      })+"\n");
    }else{
      unresolvedN++;bump(unresolvedByDomain,source_name);
      uw(source_name).write(url+"\n");unresolvedAll.write(url+"\n");
    }
  }
}
await Promise.all([
  new Promise(r=>verified.end(r)),
  new Promise(r=>unresolvedAll.end(r)),
  ...[...unresolvedWriters.values()].map(w=>new Promise(r=>w.end(r)))
]);

const expectedUnresolved={
  "mubawab.ma":81975,"avito.ma":23804,"agenz.ma":9347,"domio.ma":6843,"daragadir.com":4787,
  "promoimmomarrakech.com":3716,"masaken.ma":2047,"mouldar.com":1641,"sarouty.ma":941,
  "soukimmobilier.com":926,"limmobiliersansfrontieres.com":513,"aykana.ma":474,"atlasimmobilier.com":362,
  "1immo.ma":243,"kawtarimmobilier.com":140,"marrakechrealty.com":56,"marocannonces.com":14,"barnes-marrakech.com":4
};
if(total!==213992)throw new Error("total "+total);
if(verifiedN!==76159)throw new Error("verified "+verifiedN);
if(unresolvedN!==137833)throw new Error("unresolved "+unresolvedN);
for(const [d,n] of Object.entries(expectedUnresolved))if(unresolvedByDomain[d]!==n)throw new Error(d+" "+unresolvedByDomain[d]+" != "+n);

const manifest={
  schema_version:"akarfinder-v4.11-pre-db-verification-queue-20260927",
  input_rows:total,
  existence_verified_rows:verifiedN,
  unresolved_rows:unresolvedN,
  evidence_counts:evidence,
  unresolved_by_domain:unresolvedByDomain,
  all_rows_db_ready:false,
  rule:"No remaining row may enter Neon before existence verification AND product-field readiness certification.",
  outputs:{
    existence_verified:{file:"existence-verified.jsonl",sha256:sha(verifiedPath)},
    unresolved_all:{file:"unresolved-all.txt",sha256:sha(unresolvedAllPath)}
  },
  database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false
};
fs.writeFileSync(path.join(outDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
