#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const queueFile=arg("--queue"), evidenceFile=arg("--evidence"), matchedOut=arg("--matched"), unresolvedOut=arg("--unresolved"), summaryOut=arg("--summary");
if(!queueFile||!evidenceFile||!matchedOut||!unresolvedOut||!summaryOut) throw new Error("missing args");

function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:";
  u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
  u.hash="";
  for(const k of [...u.searchParams.keys()]) if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k)) u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function shaText(s){return crypto.createHash("sha256").update(s).digest("hex")}

const queue=fs.readFileSync(queueFile,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(canon);
const qset=new Set(queue);
if(qset.size!==queue.length) throw new Error("queue contains duplicate canonical URLs");

const evidence=new Map();
for(const line of fs.readFileSync(evidenceFile,"utf8").split(/\r?\n/)){
  if(!line.trim()) continue;
  const r=JSON.parse(line);
  const u=canon(r.canonical_url);
  if(!qset.has(u)) continue;
  evidence.set(u,r);
}

const matched=[], remaining=[];
for(const u of queue){
  const e=evidence.get(u);
  if(e) matched.push({...e,canonical_url:u,verification_state:"existence_verified_external_recent"});
  else remaining.push(u);
}
const matchedBody=matched.map(x=>JSON.stringify(x)).join("\n")+(matched.length?"\n":"");
const remainingBody=remaining.join("\n")+(remaining.length?"\n":"");
fs.writeFileSync(matchedOut,matchedBody);
fs.writeFileSync(unresolvedOut,remainingBody);

const summary={
  schema_version:"akarfinder-v4.11-external-evidence-intersection-20260927",
  queue_rows:queue.length,
  matched_rows:matched.length,
  unresolved_rows:remaining.length,
  matched_sha256:shaText(matchedBody),
  unresolved_sha256:shaText(remainingBody),
  database_access:0,database_writes:0,approved_for_import_rows:0
};
fs.writeFileSync(summaryOut,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
