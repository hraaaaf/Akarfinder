#!/usr/bin/env tsx
// Recovery-only Yandex/SearXNG harvest.
// External search-index metadata only: URL/title/snippet/rank.
// No source-page fetch, no DB client, no DB reads/writes, no publication.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";
import { getDomainEntry, getListingUrlPatterns, loadSourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";
import { buildRecoverySerperQueries } from "./recovery-serper-plan";

type Args = { offset:number; limit:number; pages:number; output:string; summary:string; searxngUrl:string };

function intEnv(name:string,fallback:number,min:number,max:number):number {
  const value=Number(process.env[name] ?? fallback);
  if(!Number.isInteger(value)||value<min||value>max) throw new Error(`${name} must be ${min}..${max}`);
  return value;
}

function args():Args {
  return {
    offset:intEnv("YANDEX_RECOVERY_OFFSET",0,0,1899),
    limit:intEnv("YANDEX_RECOVERY_LIMIT",200,1,500),
    pages:intEnv("YANDEX_RECOVERY_PAGES",2,1,3),
    output:resolve(process.env.YANDEX_RECOVERY_OUTPUT ?? "data/audits/raw-results/recovery-yandex-shadow.jsonl"),
    summary:resolve(process.env.YANDEX_RECOVERY_SUMMARY ?? "data/audits/raw-results/recovery-yandex-shadow-summary.json"),
    searxngUrl:(process.env.SEARXNG_URL ?? "http://127.0.0.1:8888").replace(/\/+$/,""),
  };
}

async function fetchPage(base:string,q:string,page:number):Promise<any[]> {
  const p=new URLSearchParams({q,format:"json",categories:"general",engines:"yandex",pageno:String(page)});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15_000);
  try {
    const response=await fetch(`${base}/search?${p}`,{signal:controller.signal});
    if(!response.ok) return [];
    const data=await response.json() as {results?:any[];unresponsive_engines?:Array<[string,string]>};
    if((data.unresponsive_engines ?? []).some(([engine])=>engine==="yandex")) return [];
    return (data.results ?? []).filter(r=>{
      const engines=Array.isArray(r.engines)?r.engines:r.engine?[r.engine]:[];
      return engines.includes("yandex") && typeof r.url==="string";
    });
  } catch { return []; }
  finally { clearTimeout(timer); }
}

function admitted(url:string):{canonical:string;domain:string}|null {
  const canonical=canonicalizeSourceUrl(url);
  if(!canonical) return null;
  const domain=extractDomain(canonical);
  if(!domain) return null;
  const registry=loadSourceDomainRegistry();
  const entry=getDomainEntry(domain,registry);
  if(!entry || entry.status!=="approved_discovery" || !entry.external_web_result) return null;
  const patterns=getListingUrlPatterns(domain,registry);
  if(patterns.length===0 || !patterns.some(p=>p.test(new URL(canonical).pathname))) return null;
  return {canonical,domain};
}

async function main(){
  const a=args();
  const plan=buildRecoverySerperQueries().slice(a.offset,a.offset+a.limit);
  const unique=new Map<string,any>();
  let raw=0, admittedCount=0, failedPages=0;

  for(const [i,q] of plan.entries()){
    for(let page=1;page<=a.pages;page++){
      const rows=await fetchPage(a.searxngUrl,q.query,page);
      if(rows.length===0) { failedPages += 1; continue; }
      raw += rows.length;
      for(const [j,r] of rows.entries()){
        const ok=admitted(r.url);
        if(!ok) continue;
        admittedCount += 1;
        const prev=unique.get(ok.canonical);
        const evidence={
          query_id:q.id,query:q.query,city:q.city??null,property_type:q.property_type??null,
          intent:q.intent??null,page,rank:r.positions?.yandex ?? j+1,
          title:typeof r.title==="string"?r.title:null,
          snippet:typeof r.content==="string"?r.content:typeof r.snippet==="string"?r.snippet:null
        };
        if(prev) prev.evidence.push(evidence);
        else unique.set(ok.canonical,{
          canonical_url:ok.canonical,source_domain:ok.domain,
          discovery_channel:"searxng_yandex",observed_at:new Date().toISOString(),evidence:[evidence]
        });
      }
    }
    if((i+1)%25===0) console.log(`[yandex-recovery] ${i+1}/${plan.length} queries raw=${raw} unique=${unique.size}`);
  }

  const lines=[...unique.values()].sort((x,y)=>x.canonical_url.localeCompare(y.canonical_url)).map(x=>JSON.stringify(x)).join("\n");
  mkdirSync(dirname(a.output),{recursive:true});
  mkdirSync(dirname(a.summary),{recursive:true});
  writeFileSync(a.output,lines+(lines?"\n":""),"utf8");
  const summary={
    mode:"recovery_yandex_shadow_read_only",offset:a.offset,queries:plan.length,pages_per_query:a.pages,
    raw_results:raw,admitted_observations:admittedCount,unique_canonical_urls:unique.size,
    failed_or_empty_pages:failedPages,database_access:0,database_writes:0,source_page_fetches:0,
    approved_for_import_rows:0,
    sha256:createHash("sha256").update(lines,"utf8").digest("hex")
  };
  writeFileSync(a.summary,JSON.stringify(summary,null,2)+"\n","utf8");
  console.log(JSON.stringify(summary,null,2));
}

void main().catch(e=>{console.error(e instanceof Error?e.stack:String(e));process.exit(1);});
