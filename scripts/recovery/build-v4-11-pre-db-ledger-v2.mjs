#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const verifiedIn=arg("--verified"), unresolvedIn=arg("--unresolved"), domio=arg("--domio"), agenz=arg("--agenz"), outDir=arg("--out-dir");
if(!verifiedIn||!unresolvedIn||!domio||!agenz||!outDir)throw new Error("missing args");

function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:"; u.hostname=u.hostname.toLowerCase().replace(/^www\./,""); u.hash="";
  for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function sha(s){return crypto.createHash("sha256").update(s).digest("hex")}
fs.mkdirSync(outDir,{recursive:true});

const oldVerified=[];
const verifiedSet=new Set();
for(const line of fs.readFileSync(verifiedIn,"utf8").split(/\r?\n/)){
  if(!line.trim())continue;
  const r=JSON.parse(line); r.canonical_url=canon(r.canonical_url);
  if(verifiedSet.has(r.canonical_url))throw new Error("duplicate old verified URL");
  verifiedSet.add(r.canonical_url); oldVerified.push(r);
}
if(oldVerified.length!==163247)throw new Error("old verified count "+oldVerified.length);

const unresolved=fs.readFileSync(unresolvedIn,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(canon);
const unresolvedSet=new Set(unresolved);
if(unresolvedSet.size!==50745)throw new Error("old unresolved count "+unresolvedSet.size);

const additions=[];
const add=(url,domain,method,meta={})=>{
  const u=canon(url);
  if(!unresolvedSet.has(u))return false;
  unresolvedSet.delete(u);
  if(verifiedSet.has(u))throw new Error("addition already verified");
  verifiedSet.add(u);
  additions.push({canonical_url:u,source_domain:domain,evidence:[method],verification_state:"existence_verified",db_ready:false,...meta});
  return true;
};

let domioAdded=0;
for(const line of fs.readFileSync(domio,"utf8").split(/\r?\n/)){
  if(!line.trim())continue;
  const r=JSON.parse(line);
  if(r.source_domain!=="domio.ma"||r.verification_method!=="official_category_listing_recent")throw new Error("Domio evidence invariant");
  if(add(r.canonical_url,"domio.ma","official_category_listing_recent",{evidence_artifact_id:10927144343}))domioAdded++;
}
if(domioAdded!==6843)throw new Error("Domio additions "+domioAdded);

let agenzEvidence=0,agenzAdded=0;
for(const line of fs.readFileSync(agenz,"utf8").split(/\r?\n/)){
  if(!line.trim())continue;
  const r=JSON.parse(line); agenzEvidence++;
  if(r.source_domain!=="agenz.ma"||r.evidence_type!=="commoncrawl_recent_index_presence")throw new Error("Agenz evidence invariant");
  if(add(r.canonical_url,"agenz.ma","commoncrawl_recent",{cc_indexes:r.cc_indexes,evidence_artifact_id:10927701179}))agenzAdded++;
}
if(agenzEvidence!==981)throw new Error("Agenz evidence rows "+agenzEvidence);
if(agenzAdded!==871)throw new Error("Agenz additions "+agenzAdded);

const verified=[...oldVerified,...additions].sort((a,b)=>a.canonical_url.localeCompare(b.canonical_url));
const unresolved2=[...unresolvedSet].sort();
if(verified.length!==170961)throw new Error("verified v2 "+verified.length);
if(unresolved2.length!==43031)throw new Error("unresolved v2 "+unresolved2.length);

const verifiedBody=verified.map(r=>JSON.stringify(r)).join("\n")+"\n";
const unresolvedBody=unresolved2.join("\n")+"\n";
fs.writeFileSync(outDir+"/existence-verified-v2.jsonl",verifiedBody);
fs.writeFileSync(outDir+"/unresolved-existence-v2.txt",unresolvedBody);

const byDomain={};
for(const r of verified)byDomain[r.source_domain]=(byDomain[r.source_domain]||0)+1;
const unresolvedByDomain={};
for(const u of unresolved2){const d=new URL(u).hostname.replace(/^www\./,"");unresolvedByDomain[d]=(unresolvedByDomain[d]||0)+1}
const manifest={
  schema_version:"akarfinder-v4.11-pre-db-ledger-v2-20260927",
  old_verified_rows:163247,
  additions:{domio_official_category:domioAdded,agenz_recent_commoncrawl:agenzAdded},
  existence_verified_rows:verified.length,
  unresolved_existence_rows:unresolved2.length,
  verified_by_domain:byDomain,
  unresolved_by_domain:unresolvedByDomain,
  verified_sha256:sha(verifiedBody),
  unresolved_sha256:sha(unresolvedBody),
  database_access:0,database_writes:0,production_neon_writes:0,vercel_deployment:false
};
fs.writeFileSync(outDir+"/manifest.json",JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
