#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const unresolved=arg("--unresolved"), evidence=arg("--evidence"), domain=arg("--domain"), matched=arg("--matched"), remaining=arg("--remaining"), summary=arg("--summary");
if(!unresolved||!evidence||!domain||!matched||!remaining||!summary) throw new Error("missing args");

function canon(raw){
  const u=new URL(String(raw).trim());
  u.protocol="https:";
  u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
  u.hash="";
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
}
function sha(s){return crypto.createHash("sha256").update(s).digest("hex")}

const queue=fs.readFileSync(unresolved,"utf8").split(/\r?\n/).filter(Boolean).filter(x=>new URL(x).hostname.replace(/^www\./,"")===domain).map(canon);
const ev=new Set(fs.readFileSync(evidence,"utf8").split(/\r?\n/).filter(Boolean).map(canon));
const yes=[],no=[];
for(const u of queue)(ev.has(u)?yes:no).push(u);
const yesBody=yes.map(canonical_url=>JSON.stringify({canonical_url,source_domain:domain,verification_state:"existence_verified",verification_method:"official_category_listing_recent",database_access:0,database_writes:0})).join("\n")+(yes.length?"\n":"");
const noBody=no.join("\n")+(no.length?"\n":"");
fs.writeFileSync(matched,yesBody);fs.writeFileSync(remaining,noBody);
const s={
  schema_version:"akarfinder-v4.11-url-list-evidence-intersection-20260927",
  domain,
  queue_rows:queue.length,
  evidence_rows:ev.size,
  matched_rows:yes.length,
  unresolved_rows:no.length,
  evidence_method:"official_category_listing_recent",
  matched_sha256:sha(yesBody),
  unresolved_sha256:sha(noBody),
  database_access:0,database_writes:0,approved_for_import_rows:0
};
fs.writeFileSync(summary,JSON.stringify(s,null,2)+"\n");
console.log(JSON.stringify(s,null,2));
