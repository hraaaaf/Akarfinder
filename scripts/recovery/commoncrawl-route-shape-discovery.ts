#!/usr/bin/env tsx
import {createHash} from "node:crypto";
import {mkdirSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";

const INDEXES=["CC-MAIN-2026-39","CC-MAIN-2026-34","CC-MAIN-2026-30","CC-MAIN-2026-25","CC-MAIN-2026-21"] as const;
const ALLOWED=new Set(["dardar.ma","sekna.ma","nador.immo","maisonessaouira.com","essaouira.immo","proimmobilier.ma"]);
const domain=process.env.ROUTE_DISCOVERY_DOMAIN||"";
if(!ALLOWED.has(domain))throw new Error("unsupported domain");
const PAGE_SIZE=5,MAX_PAGES=20,PACING_MS=800;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const base=(i:string)=>`https://index.commoncrawl.org/${i}-index`;
async function fetchText(url:string){for(let n=0;n<4;n++){try{const r=await fetch(url,{headers:{"user-agent":"AkarFinder-Recovery-Offline/1.0 metadata-only"}});if(r.ok||r.status===404)return r}catch{}await sleep(1000*2**n)}throw new Error("fetch failed")}
function canon(raw:string){try{const u=new URL(raw);u.hash="";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid)$/i.test(k))u.searchParams.delete(k);return u.toString()}catch{return null}}
function token(s:string){const x=decodeURIComponent(s).toLowerCase();if(/^(fr|en|ar)$/.test(x))return x;if(/^\d+$/.test(x))return ":n";if(/^[a-f0-9]{6,}$/i.test(x))return ":hex";if(/^(annonce|annonces|vente|vendre|achat|acheter|location|louer|rent|buy|property|properties|propriete|proprietes|listing|listings|bien|biens|immobilier)$/.test(x))return x;return ":s"}
function sig(raw:string){const u=new URL(raw);return "/"+u.pathname.split("/").filter(Boolean).map(token).join("/")}

async function main(){
  const seen=new Set<string>();const perIndex:any[]=[];let rawTotal=0,failed=0;
  for(const index of INDEXES){
    const qi=new URLSearchParams({url:domain,matchType:"domain",showNumPages:"true",pageSize:String(PAGE_SIZE)});
    let ir:Response;
    try{ir=await fetchText(`${base(index)}?${qi}`)}catch{failed++;perIndex.push({index,pages:0,raw:0,failed_index:true});continue}
    if(ir.status===404){perIndex.push({index,pages:0,raw:0});continue}
    const info:any=await ir.json();const pages=Math.min(Number(info.pages||0),MAX_PAGES);let raw=0;
    for(let page=0;page<pages;page++){
      const q=new URLSearchParams({url:domain,matchType:"domain",output:"json",fl:"url",pageSize:String(PAGE_SIZE),page:String(page)});
      try{const r=await fetchText(`${base(index)}?${q}`);if(r.status===404)continue;for(const line of (await r.text()).split("\n")){if(!line.trim())continue;try{const j=JSON.parse(line);if(typeof j.url!=="string")continue;raw++;rawTotal++;const c=canon(j.url);if(c&&new URL(c).hostname===domain)seen.add(c)}catch{}}}catch{failed++}
      await sleep(PACING_MS);
    }
    perIndex.push({index,pages,raw,cumulative_unique:seen.size});
  }
  const urls=[...seen].sort();const counts=new Map<string,number>();for(const u of urls){const s=sig(u);counts.set(s,(counts.get(s)||0)+1)}
  const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([signature,count])=>({signature,count}));
  const outDir=resolve("data/audits/raw-results");mkdirSync(outDir,{recursive:true});const safe=domain.replace(/[^a-z0-9]+/gi,"-");
  const samples=urls.slice(0,1000);const body=samples.join("\n")+(samples.length?"\n":"");
  writeFileSync(resolve(outDir,`route-discovery-${safe}-samples.txt`),body);
  const summary={schema_version:"akarfinder-route-discovery-v1",domain,indexes:INDEXES.length,max_pages_per_index:MAX_PAGES,raw_records:rawTotal,unique_urls:urls.length,sample_rows:samples.length,top_signatures:top,per_index:perIndex,failed_pages:failed,database_access:0,database_writes:0,source_page_fetches:0,warc_downloads:0,approved_for_import_rows:0,sha256:createHash("sha256").update(body).digest("hex")};
  writeFileSync(resolve(outDir,`route-discovery-${safe}-summary.json`),JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));
  
}

main().catch((error)=>{console.error(error);process.exit(1)});
