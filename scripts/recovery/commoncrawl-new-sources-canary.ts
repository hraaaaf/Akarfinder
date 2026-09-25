#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const indexes = [
"CC-MAIN-2026-39","CC-MAIN-2026-34","CC-MAIN-2026-30","CC-MAIN-2026-25","CC-MAIN-2026-21","CC-MAIN-2026-17","CC-MAIN-2026-12","CC-MAIN-2026-08","CC-MAIN-2026-04",
"CC-MAIN-2025-51","CC-MAIN-2025-47","CC-MAIN-2025-43","CC-MAIN-2025-38","CC-MAIN-2025-33","CC-MAIN-2025-30","CC-MAIN-2025-26","CC-MAIN-2025-21","CC-MAIN-2025-18","CC-MAIN-2025-13","CC-MAIN-2025-08","CC-MAIN-2025-05"
];
const sources = [
  {domain:"domio.ma", pattern:/^\/fr\/[^/]+\/(?:vendre|louer)\/[^/]+\/\d+\/[^/]+\/?$/},
  {domain:"capalmrabat.com", pattern:/^\/biens\/[^/]+\/[^/]+\/[^/?]+\/?$/},
  {domain:"immoessaouira.com", pattern:/^\/fr\/(?:achat|location)\/[^/]+\/[^/]+\/[^/]+\/[a-f0-9]{8}\/?$/},
  {domain:"fadlimmo.com", pattern:/^\/fr\/(?:achat|location)\/[^/]+\/[^/]+\/[^/]+\/[a-f0-9]{8}\/?$/},
  {domain:"bakimmo.com", pattern:/^\/fr\/(?:achat|location)\/[^/]+\/[^/]+\/[^/]+\/[a-f0-9]{8}\/?$/}
];

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function cdx(domain:string,index:string){
  const u=`https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url&limit=50000`;
  for(let a=1;a<=4;a++){
    try{
      const r=await fetch(u);
      if(r.status===404) return [];
      if(r.ok){
        const t=await r.text(); const out:string[]=[];
        for(const line of t.split("\n")){ if(!line.trim()) continue; try{const j=JSON.parse(line); if(j.url) out.push(j.url);}catch{} }
        return out;
      }
      if(![429,500,502,503,504].includes(r.status)||a===4) return [];
    }catch{ if(a===4) return []; }
    await sleep(1500*Math.pow(2,a-1));
  }
  return [];
}
function canonical(raw:string){
  try{
    const u=new URL(raw); u.hash=""; u.search="";
    u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
    u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
    return u.toString().replace(/\/$/,"");
  }catch{return null;}
}
async function main(){
  const all=new Map<string,{domain:string,indexes:Set<string>}>();
  const per:any[]=[];
  for(const s of sources){
    const set=new Set<string>(); let raw=0;
    for(const idx of indexes){
      const rows=await cdx(s.domain,idx); raw+=rows.length;
      for(const x of rows){
        const c=canonical(x); if(!c) continue;
        const u=new URL(c);
        if(u.hostname!==s.domain) continue;
        if(!s.pattern.test(u.pathname)) continue;
        set.add(c);
        const prev=all.get(c); if(prev) prev.indexes.add(idx); else all.set(c,{domain:s.domain,indexes:new Set([idx])});
      }
      await sleep(1200);
    }
    per.push({domain:s.domain,raw_records:raw,unique_matching_urls:set.size});
  }
  const rows=[...all.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([canonical_url,v])=>({canonical_url,source_domain:v.domain,indexes:[...v.indexes].sort()}));
  const output=resolve("data/audits/raw-results/recovery-new-sources-commoncrawl.jsonl");
  const summaryPath=resolve("data/audits/raw-results/recovery-new-sources-commoncrawl-summary.json");
  mkdirSync(dirname(output),{recursive:true});
  const body=rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":"");
  writeFileSync(output,body);
  const summary={
    mode:"recovery_new_sources_commoncrawl_shadow",
    indexes:indexes.length,
    per_domain:per,
    global_unique_urls:rows.length,
    database_access:0,database_writes:0,source_page_fetches:0,approved_for_import_rows:0,
    sha256:createHash("sha256").update(body).digest("hex")
  };
  writeFileSync(summaryPath,JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exit(1);});
