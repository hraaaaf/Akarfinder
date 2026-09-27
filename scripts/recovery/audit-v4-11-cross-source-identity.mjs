#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { normalize as pathNormalize } from "node:path";

function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null}
const input=arg("--input"),safeOut=arg("--safe-output"),quarantineOut=arg("--quarantine-output"),summaryOut=arg("--summary");
if(!input||!safeOut||!quarantineOut||!summaryOut) throw new Error("missing args");

const rows=fs.readFileSync(input,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const norm=v=>typeof v==="string"
  ? v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/\s+/g," ")
  : v;

const strongFields=["city","district","property_type","transaction_type","price_mad","surface_m2","bedrooms_count"];
const broadFields=["city","property_type","transaction_type","surface_m2","bedrooms_count"];

function groups(fields){
  const m=new Map();
  for(const r of rows){
    const vals=fields.map(f=>r[f]);
    if(vals.some(v=>v===null||v===undefined||v==="")) continue;
    const k=JSON.stringify(vals.map(norm));
    const a=m.get(k)||[]; a.push(r); m.set(k,a);
  }
  return [...m.entries()].filter(([,g])=>g.length>1 && new Set(g.map(x=>x.source_name)).size>1);
}
const strong=groups(strongFields);
const broad=groups(broadFields);
if(strong.length!==0) throw new Error("unexpected strong cross-source collision groups: "+strong.length);
if(broad.length!==2) throw new Error("expected 2 broad cross-source collision groups, got "+broad.length);

const quarantineUrls=new Set();
for(const [,g] of broad) for(const r of g) quarantineUrls.add(r.listing_url);
if(quarantineUrls.size!==21) throw new Error("expected 21 quarantined rows, got "+quarantineUrls.size);

const safe=rows.filter(r=>!quarantineUrls.has(r.listing_url));
const quarantine=rows.filter(r=>quarantineUrls.has(r.listing_url));
if(safe.length!==8367) throw new Error("expected 8367 safe rows, got "+safe.length);
if(new Set(safe.map(r=>r.listing_url)).size!==safe.length) throw new Error("safe URL dedup failed");
if(new Set(safe.map(r=>r.canonical_fingerprint)).size!==safe.length) throw new Error("safe fingerprint dedup failed");

fs.writeFileSync(safeOut,safe.map(r=>JSON.stringify(r)).join("\n")+"\n");
fs.writeFileSync(quarantineOut,quarantine.map(r=>JSON.stringify(r)).join("\n")+"\n");

const byDomain=safe.reduce((m,r)=>(m[r.source_name]=(m[r.source_name]||0)+1,m),{});
const qByDomain=quarantine.reduce((m,r)=>(m[r.source_name]=(m[r.source_name]||0)+1,m),{});
const summary={
  schema_version:"akarfinder-v4.11-g6-cross-source-identity-audit-20260926",
  input_rows:rows.length,
  strong_signature_fields:strongFields,
  strong_cross_source_groups:strong.length,
  broad_signature_fields:broadFields,
  broad_cross_source_groups:broad.length,
  quarantined_rows:quarantine.length,
  safe_rows:safe.length,
  safe_by_domain:byDomain,
  quarantine_by_domain:qByDomain,
  decision:"do_not_merge; quarantine broad cross-source ambiguity; preserve source representations",
  approved_for_import_rows:0,
  database_access:0,
  database_writes:0,
  input_sha256:crypto.createHash("sha256").update(fs.readFileSync(input)).digest("hex"),
  safe_sha256:crypto.createHash("sha256").update(fs.readFileSync(safeOut)).digest("hex"),
  quarantine_sha256:crypto.createHash("sha256").update(fs.readFileSync(quarantineOut)).digest("hex")
};
fs.writeFileSync(summaryOut,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
