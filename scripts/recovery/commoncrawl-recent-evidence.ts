#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const INDEXES=(process.env.RECENT_CC_INDEXES??"CC-MAIN-2026-39,CC-MAIN-2026-34,CC-MAIN-2026-30").split(",").map(s=>s.trim()).filter(Boolean);
const DOMAINS=(process.env.RECENT_CC_DOMAINS??"mubawab.ma,agenz.ma,avito.ma").split(",").map(s=>s.trim()).filter(Boolean);

const PATTERNS:Record<string,RegExp[]>={
 "mubawab.ma":[/(?:\/fr|\/en)\/is\//,/(?:\/fr|\/en)\/a\/\d+\//,/\/acheter\/[^/]+-\d+(?:\.html)?$/],
 "agenz.ma":[/\/(?:fr|en)\/annonces\/.+\/\d+$/],
 "avito.ma":[/^\/fr\/[^/]+\/(?:appartements|villas_et_riads|terrains_et_fermes|local|bureaux|maisons_et_villas|autre_immobilier|autres_immobilier|magasins_et_commerces|locations_de_vacances)\/.+_\d{7,}\.htm\/?$/]
};
const PAGE_SIZE=5, PACING_MS=1200, MAX_ATTEMPTS=5;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function fetchRetry(url:string){
 let last:unknown;
 for(let i=1;i<=MAX_ATTEMPTS;i++){
  try{
   const r=await fetch(url,{headers:{"user-agent":"AkarFinder-Recovery-Recent-CC/1.0 metadata-only"}});
   if(r.ok||r.status===404)return r;
   last=new Error(`HTTP ${r.status}`);
   if(![429,500,502,503,504].includes(r.status))throw last;
  }catch(e){last=e}
  if(i<MAX_ATTEMPTS)await sleep(1800*2**(i-1));
 }
 throw last instanceof Error?last:new Error(String(last));
}
function base(index:string){return `https://index.commoncrawl.org/${index}-index`}
function canonical(raw:string){
 try{
  const u=new URL(raw);u.protocol="https:";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");u.hash="";
  for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid|yclid)$/i.test(k))u.searchParams.delete(k);
  u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
  return u.toString();
 }catch{return null}
}
async function pages(index:string,domain:string){
 const q=new URLSearchParams({url:domain,matchType:"domain",showNumPages:"true",pageSize:String(PAGE_SIZE)});
 const r=await fetchRetry(`${base(index)}?${q}`);if(r.status===404)return 0;
 const j=await r.json() as any;return Number(j.pages??0);
}
async function urls(index:string,domain:string,page:number){
 const q=new URLSearchParams({url:domain,matchType:"domain",output:"json",fl:"url",pageSize:String(PAGE_SIZE),page:String(page)});
 const r=await fetchRetry(`${base(index)}?${q}`);if(r.status===404)return [] as string[];
 const txt=await r.text(),out:string[]=[];
 for(const line of txt.split("\n")){if(!line.trim())continue;try{const j=JSON.parse(line);if(typeof j.url==="string")out.push(j.url)}catch{}}
 return out;
}

async function main(){
 const outDir=resolve("data/audits/raw-results/recent-cc-recovery");mkdirSync(outDir,{recursive:true});
 const global:any[]=[];
 for(const domain of DOMAINS){
  const patterns=PATTERNS[domain];if(!patterns)throw new Error(`unsupported domain ${domain}`);
  const evidence=new Map<string,Set<string>>();let raw=0,failedPages=0;
  const perIndex:any[]=[];
  for(const index of INDEXES){
   let count=0;let pageCount=0;
   try{pageCount=await pages(index,domain)}catch(e){perIndex.push({index,error:String(e),pages:0,raw_records:0,matching_urls:0});continue}
   for(let page=0;page<pageCount;page++){
    try{
     const rows=await urls(index,domain,page);raw+=rows.length;
     for(const x of rows){const c=canonical(x);if(!c)continue;const u=new URL(c);if(u.hostname!==domain)continue;if(!patterns.some(p=>p.test(u.pathname)))continue;
      const set=evidence.get(c)??new Set<string>();set.add(index);evidence.set(c,set);count++;
     }
    }catch(e){failedPages++;console.error(`[recent-cc] ${domain} ${index} page=${page}: ${String(e)}`)}
    await sleep(PACING_MS);
   }
   perIndex.push({index,pages:pageCount,matching_records:count,unique_seen_to_date:evidence.size});
  }
  const rows=[...evidence.entries()].map(([canonical_url,set])=>{
   const cc_indexes=INDEXES.filter(i=>set.has(i));
   return {canonical_url,source_domain:domain,cc_indexes,latest_index:cc_indexes[0]??null,evidence_type:"commoncrawl_recent_index_presence",database_access:0,database_writes:0};
  }).sort((a,b)=>a.canonical_url.localeCompare(b.canonical_url));
  const body=rows.map(r=>JSON.stringify(r)).join("\n")+(rows.length?"\n":"");
  const safe=domain.replace(/[^a-z0-9]+/gi,"-");
  writeFileSync(resolve(outDir,`${safe}.jsonl`),body);
  const summary={domain,indexes:INDEXES,unique_urls:rows.length,raw_records:raw,failed_pages:failedPages,per_index:perIndex,sha256:createHash("sha256").update(body).digest("hex")};
  writeFileSync(resolve(outDir,`${safe}-summary.json`),JSON.stringify(summary,null,2)+"\n");
  global.push(summary);
 }
 const manifest={schema_version:"akarfinder-recent-cc-evidence-v1",domains:DOMAINS,indexes:INDEXES,results:global,database_access:0,database_writes:0,source_page_fetches:0,warc_downloads:0,approved_for_import_rows:0};
 writeFileSync(resolve(outDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
 console.log(JSON.stringify(manifest,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
