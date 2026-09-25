#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const UA="AkarFinder-Recovery-BigSitemap/1.0";
const TIMEOUT=15000;
const PACE=350;
const MAX_FILES=500;
const MAX_URLS=500000;

const SOURCES={
  "marocimmo.com":[/^\/fr\/(?:vente|location)\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/?$/],
  "sarout.ma":[/^\/(?:fr|ar)\/annonce\/\d+\/[^/]+\/?$/],
  "marocannonces.com":[/^\/categorie\/\d+\/[^/]+\/annonce\/\d+\/[^/]+\.html$/],
  "mubawab.ma":[/\/(?:fr|en)\/is\//,/\/(?:fr|en)\/a\/\d+\//,/\/acheter\/[^/]+-\d+(?:\.html)?$/],
  "avito.ma":[/^\/fr\/[^/]+\/(?:appartements|villas_et_riads|terrains_et_fermes|local|bureaux|maisons_et_villas|autre_immobilier|autres_immobilier|magasins_et_commerces|locations_de_vacances)\/.+_\d{7,}\.htm\/?$/],
  "sarouty.ma":[/^\/(?:fr|en|ar)\/plp\/[^/]+\/[^/]+-\d+\.html$/,/\/plp\/acheter\/.+-\d+(?:\.html)?$/,/\/acheter\/[a-z0-9-]+-\d+(?:\.html)?$/],
  "soukimmobilier.com":[/\/(?:fr|ar)\/[a-z-]+\/[a-z]+\/\d{4,}$/]
} as const;

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function host(raw:string){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return null}}
async function fetchBuf(url:string){
 const c=new AbortController(); const t=setTimeout(()=>c.abort(),TIMEOUT);
 try{
  const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"user-agent":UA,accept:"application/xml,text/xml,text/plain,*/*;q=0.1"}});
  if(!r.ok) return null;
  if(host(url)!==host(r.url||url)) return null;
  return Buffer.from(await r.arrayBuffer());
 }catch{return null}finally{clearTimeout(t)}
}
function text(bytes:Buffer){const b=bytes.length>1&&bytes[0]===0x1f&&bytes[1]===0x8b?gunzipSync(bytes):bytes;return b.toString("utf8")}
function robotsSitemaps(s:string,domain:string){
 const out:string[]=[]; for(const line of s.split(/\r?\n/)){const m=line.match(/^\s*Sitemap\s*:\s*(\S+)/i); if(m&&host(m[1])===domain) out.push(m[1]);}
 return [...new Set(out)];
}
function locs(xml:string){return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,"&").trim())}
function isIndex(xml:string){return /<sitemapindex\b/i.test(xml)}
function canonical(raw:string){
 try{const u=new URL(raw);u.hash="";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");for(const k of [...u.searchParams.keys()]) if(/^utm_|^(fbclid|gclid|msclkid)$/i.test(k)) u.searchParams.delete(k);u.pathname=u.pathname.replace(/\/{2,}/g,"/");return u.toString()}catch{return null}
}

async function harvest(domain:keyof typeof SOURCES){
 const robots=await fetchBuf(`https://${domain}/robots.txt`);
 if(!robots) return {domain,robots_ok:false,declared_sitemaps:0,files:0,raw_urls:0,unique_matching:0,urls:[] as string[]};
 const roots=robotsSitemaps(robots.toString("utf8"),domain);
 const q=[...roots], seenFiles=new Set<string>(), urls=new Set<string>(); let raw=0;
 while(q.length&&seenFiles.size<MAX_FILES&&raw<MAX_URLS){
  const u=q.shift()!; if(seenFiles.has(u)||host(u)!==domain) continue; seenFiles.add(u);
  const b=await fetchBuf(u); await sleep(PACE); if(!b) continue;
  let x=""; try{x=text(b)}catch{continue}
  const ls=locs(x);
  if(isIndex(x)){for(const child of ls) if(host(child)===domain&&!seenFiles.has(child)&&q.length+seenFiles.size<MAX_FILES) q.push(child); continue}
  raw+=ls.length;
  for(const loc of ls){const c=canonical(loc); if(!c||host(c)!==domain) continue; const p=new URL(c).pathname; if(SOURCES[domain].some(rx=>rx.test(p))) urls.add(c)}
 }
 return {domain,robots_ok:true,declared_sitemaps:roots.length,files:seenFiles.size,raw_urls:raw,unique_matching:urls.size,urls:[...urls].sort()};
}
async function main(){
 const domain=process.env.BIG_SITEMAP_DOMAIN as keyof typeof SOURCES|undefined;
 if(!domain||!(domain in SOURCES)) throw new Error("BIG_SITEMAP_DOMAIN invalid");
 const r=await harvest(domain);
 const safe=domain.replace(/[^a-z0-9]+/gi,"-"), dir=resolve("data/audits/raw-results"); mkdirSync(dir,{recursive:true});
 const body=r.urls.join("\n")+(r.urls.length?"\n":"");
 writeFileSync(resolve(dir,`recovery-big-sitemap-${safe}.txt`),body);
 const summary={schema_version:"akarfinder-recovery-big-sitemap-v1",domain:r.domain,robots_ok:r.robots_ok,declared_sitemaps:r.declared_sitemaps,sitemap_files_fetched:r.files,raw_urls_seen:r.raw_urls,unique_matching_listing_urls:r.unique_matching,database_access:0,database_writes:0,listing_page_fetches:0,robots_declared_sitemaps_only:true,approved_for_import_rows:0,sha256:createHash("sha256").update(body).digest("hex")};
 writeFileSync(resolve(dir,`recovery-big-sitemap-${safe}-summary.json`),JSON.stringify(summary,null,2)+"\n");
 console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});