#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const INDEXES = [
  "CC-MAIN-2026-39","CC-MAIN-2026-34","CC-MAIN-2026-30","CC-MAIN-2026-25","CC-MAIN-2026-21","CC-MAIN-2026-17","CC-MAIN-2026-12","CC-MAIN-2026-08","CC-MAIN-2026-04",
  "CC-MAIN-2025-51","CC-MAIN-2025-47","CC-MAIN-2025-43","CC-MAIN-2025-38","CC-MAIN-2025-33","CC-MAIN-2025-30","CC-MAIN-2025-26","CC-MAIN-2025-21","CC-MAIN-2025-18","CC-MAIN-2025-13","CC-MAIN-2025-08","CC-MAIN-2025-05"
] as const;

const SOURCES = {
  "mubawab.ma": [
    /\/(?:fr|en)\/is\//,
    /\/(?:fr|en)\/a\/\d+\//,
    /\/acheter\/[^/]+-\d+(?:\.html)?$/
  ],
  "avito.ma": [
    /^\/fr\/[^/]+\/(?:appartements|villas_et_riads|terrains_et_fermes|local|bureaux|maisons_et_villas|autre_immobilier|autres_immobilier|magasins_et_commerces|locations_de_vacances)\/.+_\d{7,}\.htm\/?$/
  ],
  "marocannonces.com": [
    /^\/categorie\/\d+\/[^/]+\/annonce\/\d+\/[^/]+\.html$/
  ],
  "sarout.ma": [
    /^\/(?:fr|ar)\/annonce\/\d+\/[^/]+\/?$/
  ],
  "sarouty.ma": [
    /^\/(?:fr|en|ar)\/plp\/[^/]+\/[^/]+-\d+\.html$/,
    /\/plp\/acheter\/.+-\d+(?:\.html)?$/,
    /\/acheter\/[a-z0-9-]+-\d+(?:\.html)?$/
  ],
  "marocimmo.com": [
    /^\/fr\/(?:vente|location)\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/?$/
  ],
  "soukimmobilier.com": [
    /\/(?:fr|ar)\/[a-z-]+\/[a-z]+\/\d{4,}$/
  ],
  "agenz.ma": [
    /\/(?:fr|en)\/annonces\/.+\/\d+$/
  ],
  "masaken.ma": [
    /^\/(?:fr|en)\/immobilier-maroc\/[a-z-]+\/\d+$/
  ],
  "mouldar.com": [
    /\/(?:fr|en)\/(?:rent|achat|buy|louer|location)\/.+\/[a-f0-9]{6,}$/i
  ],
  "daragadir.com": [
    /^\/annonces\/annonces-immobilieres\/(?:vente|location|location-de-vacances)\/[^/]+\/[^/]+\.html$/
  ],
  "1immo.ma": [
    /^\/[^/]+-\d+$/
  ],
  "promoimmomarrakech.com": [
    /^\/produit\/[^/]+\/[^/]+\.html$/
  ]
} as const;

const PAGE_SIZE_BLOCKS = 5;
const PACING_MS = 1400;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 2500;

const domain = process.env.BIG_PORTAL_DOMAIN as keyof typeof SOURCES | undefined;
if (!domain || !(domain in SOURCES)) {
  throw new Error(`BIG_PORTAL_DOMAIN must be one of: ${Object.keys(SOURCES).join(", ")}`);
}
const patterns = SOURCES[domain];

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function fetchText(url:string):Promise<Response>{
  let last:unknown;
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    try{
      const r=await fetch(url,{headers:{"user-agent":"AkarFinder-Recovery-Offline/1.0 metadata-only"}});
      if(r.ok || r.status===404) return r;
      last=new Error(`HTTP ${r.status}`);
      if(![429,500,502,503,504].includes(r.status)) throw last;
    }catch(e){ last=e; }
    if(attempt<MAX_ATTEMPTS) await sleep(RETRY_BASE_MS*2**(attempt-1));
  }
  throw last instanceof Error ? last : new Error(String(last));
}

function baseUrl(index:string){
  return `https://index.commoncrawl.org/${index}-index`;
}

async function pageInfo(index:string){
  const q=new URLSearchParams({
    url:domain,
    matchType:"domain",
    showNumPages:"true",
    pageSize:String(PAGE_SIZE_BLOCKS)
  });
  const r=await fetchText(`${baseUrl(index)}?${q}`);
  if(r.status===404) return {pages:0,blocks:0,pageSize:PAGE_SIZE_BLOCKS};
  const j=await r.json() as any;
  return {
    pages:Number(j.pages ?? 0),
    blocks:Number(j.blocks ?? 0),
    pageSize:Number(j.pageSize ?? PAGE_SIZE_BLOCKS)
  };
}

async function pageUrls(index:string,page:number){
  const q=new URLSearchParams({
    url:domain,
    matchType:"domain",
    output:"json",
    fl:"url",
    pageSize:String(PAGE_SIZE_BLOCKS),
    page:String(page)
  });
  const r=await fetchText(`${baseUrl(index)}?${q}`);
  if(r.status===404) return [] as string[];
  const txt=await r.text();
  const rows:string[]=[];
  for(const line of txt.split("\n")){
    if(!line.trim()) continue;
    try{
      const j=JSON.parse(line);
      if(typeof j.url==="string") rows.push(j.url);
    }catch{}
  }
  return rows;
}

function canonical(raw:string){
  try{
    const u=new URL(raw);
    u.hash="";
    for(const k of [...u.searchParams.keys()]){
      if(/^utm_|^(fbclid|gclid|msclkid)$/i.test(k)) u.searchParams.delete(k);
    }
    u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
    u.pathname=u.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/";
    const s=u.toString();
    return s.endsWith("/") && u.pathname!=="/" ? s.slice(0,-1) : s;
  }catch{return null;}
}

async function main(){
  const seen=new Set<string>();
  const perIndex:any[]=[];
  let totalRaw=0;
  let totalPages=0;
  let failedPages=0;

  for(const index of INDEXES){
    let info;
    try{ info=await pageInfo(index); }
    catch(e){
      perIndex.push({index,error:String(e),pages:0,raw_records:0,matching_unique:0});
      await sleep(PACING_MS);
      continue;
    }
    totalPages += info.pages;
    let raw=0;
    let before=seen.size;
    for(let page=0;page<info.pages;page++){
      try{
        const urls=await pageUrls(index,page);
        raw += urls.length;
        totalRaw += urls.length;
        for(const rawUrl of urls){
          const c=canonical(rawUrl); if(!c) continue;
          const u=new URL(c);
          if(u.hostname!==domain) continue;
          if(patterns.some((p)=>p.test(u.pathname))) seen.add(c);
        }
      }catch(e){
        failedPages++;
        console.error(`[big-portals] ${domain} ${index} page=${page} failed: ${String(e)}`);
      }
      await sleep(PACING_MS);
    }
    perIndex.push({
      index,
      blocks:info.blocks,
      pages:info.pages,
      raw_records:raw,
      new_matching_unique:seen.size-before,
      cumulative_matching_unique:seen.size
    });
    console.log(`[big-portals] ${domain} ${index}: pages=${info.pages} raw=${raw} cumulative=${seen.size}`);
    await sleep(PACING_MS);
  }

  const rows=[...seen].sort();
  const outDir=resolve("data/audits/raw-results");
  mkdirSync(outDir,{recursive:true});
  const safe=domain.replace(/[^a-z0-9]+/gi,"-");
  const out=resolve(outDir,`recovery-big-portal-${safe}.txt`);
  const summaryPath=resolve(outDir,`recovery-big-portal-${safe}-summary.json`);
  const body=rows.join("\n")+(rows.length?"\n":"");
  writeFileSync(out,body);
  const summary={
    schema_version:"akarfinder-recovery-big-portal-v1",
    domain,
    indexes:INDEXES.length,
    page_size_blocks:PAGE_SIZE_BLOCKS,
    pages_reported:totalPages,
    failed_pages:failedPages,
    raw_cdx_records:totalRaw,
    unique_matching_listing_urls:rows.length,
    per_index:perIndex,
    database_access:0,
    database_writes:0,
    source_page_fetches:0,
    warc_downloads:0,
    approved_for_import_rows:0,
    sha256:createHash("sha256").update(body).digest("hex")
  };
  writeFileSync(summaryPath,JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exit(1);});
