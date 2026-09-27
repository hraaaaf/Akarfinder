#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const verifiedIn=arg("--verified"),unresolvedIn=arg("--unresolved"),evidenceDir=arg("--evidence-dir"),outDir=arg("--out-dir");
if(!verifiedIn||!unresolvedIn||!evidenceDir||!outDir)throw new Error("missing args");

function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");u.hash="";
  for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function sha(s){return crypto.createHash("sha256").update(s).digest("hex")}
function walk(dir){
  const out=[];for(const n of fs.readdirSync(dir)){const p=path.join(dir,n),st=fs.statSync(p);if(st.isDirectory())out.push(...walk(p));else out.push(p)}return out;
}
fs.mkdirSync(outDir,{recursive:true});
const verified=[],verifiedSet=new Set();
for(const line of fs.readFileSync(verifiedIn,"utf8").split(/\r?\n/)){
  if(!line.trim())continue;const r=JSON.parse(line);r.canonical_url=canon(r.canonical_url);
  if(verifiedSet.has(r.canonical_url))throw new Error("duplicate verified");
  verifiedSet.add(r.canonical_url);verified.push(r);
}
if(verified.length!==170961)throw new Error("expected v2 verified 170961, got "+verified.length);
const unresolved=fs.readFileSync(unresolvedIn,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(canon);
const unresolvedSet=new Set(unresolved);
if(unresolvedSet.size!==43031)throw new Error("expected v2 unresolved 43031, got "+unresolvedSet.size);

const additions=[],byDomain={};
for(const file of walk(evidenceDir).filter(f=>f.endsWith(".json")&&!f.endsWith("-summary.json")&&!f.endsWith("summary.json"))){
  let data;
  try{data=JSON.parse(fs.readFileSync(file,"utf8"))}catch{continue}
  if(!Array.isArray(data))continue;
  for(const r of data){
    if(Number(r.http_status)!==200)continue;
    const raw=r.url||r.canonical_url||r.listing_url;if(!raw)continue;
    let u;try{u=canon(raw)}catch{continue}
    if(!unresolvedSet.has(u))continue;
    unresolvedSet.delete(u);
    if(verifiedSet.has(u))throw new Error("addition already verified "+u);
    verifiedSet.add(u);
    const domain=new URL(u).hostname.replace(/^www\./,"");
    additions.push({canonical_url:u,source_domain:domain,evidence:["direct_http200"],verification_state:"existence_verified",db_ready:false});
    byDomain[domain]=(byDomain[domain]||0)+1;
  }
}
if(additions.length!==7744)throw new Error("expected additions 7744, got "+additions.length);
const expected={
 "promoimmomarrakech.com":3705,
 "daragadir.com":2963,
 "aykana.ma":399,
 "atlasimmobilier.com":361,
 "limmobiliersansfrontieres.com":242,
 "1immo.ma":59,
 "kawtarimmobilier.com":15
};
for(const [d,n] of Object.entries(expected))if(byDomain[d]!==n)throw new Error(d+" "+byDomain[d]+" != "+n);

const v3=[...verified,...additions].sort((a,b)=>a.canonical_url.localeCompare(b.canonical_url));
const u3=[...unresolvedSet].sort();
if(v3.length!==178705)throw new Error("verified v3 "+v3.length);
if(u3.length!==35287)throw new Error("unresolved v3 "+u3.length);
const vb=v3.map(r=>JSON.stringify(r)).join("\n")+"\n",ub=u3.join("\n")+"\n";
fs.writeFileSync(path.join(outDir,"existence-verified-v3.jsonl"),vb);
fs.writeFileSync(path.join(outDir,"unresolved-existence-v3.txt"),ub);
const unresolvedByDomain={};for(const u of u3){const d=new URL(u).hostname.replace(/^www\./,"");unresolvedByDomain[d]=(unresolvedByDomain[d]||0)+1}
const manifest={
 schema_version:"akarfinder-v4.11-pre-db-ledger-v3-20260927",
 previous_verified_rows:170961,
 direct_http200_additions:additions.length,
 additions_by_domain:byDomain,
 existence_verified_rows:v3.length,
 unresolved_existence_rows:u3.length,
 total_eligible_including_wave1:v3.length+8367,
 gap_to_200k_including_wave1:200000-(v3.length+8367),
 unresolved_by_domain:unresolvedByDomain,
 verified_sha256:sha(vb),unresolved_sha256:sha(ub),
 database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false
};
fs.writeFileSync(path.join(outDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
