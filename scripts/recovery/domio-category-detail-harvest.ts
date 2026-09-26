#!/usr/bin/env tsx
import { gunzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const DOMAIN="domio.ma";
const UA="AkarFinder-Recovery-Domio-CategoryHarvest/1.0";
const TIMEOUT=15000;
const PACE=300;
const MAX_CATEGORY_PAGES=5000;
const MAX_DETAIL_URLS=50000;

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function host(raw:string){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return null}}
async function fetchText(url:string){
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),TIMEOUT);
  try{
    const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"user-agent":UA,accept:"text/html,application/xml,text/xml;q=0.9,*/*;q=0.1"}});
    if(!r.ok) return null;
    if(host(url)!==host(r.url||url)) return null;
    const b=Buffer.from(await r.arrayBuffer());
    const x=b.length>1&&b[0]===0x1f&&b[1]===0x8b?gunzipSync(b):b;
    return x.toString("utf8");
  }catch{return null}finally{clearTimeout(t)}
}
function locs(x:string){return [...x.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,"&").trim())}
function isIndex(x:string){return /<sitemapindex\b/i.test(x)}
function robotsRoots(s:string){return [...new Set(s.split(/\r?\n/).map(l=>l.match(/^\s*Sitemap\s*:\s*(\S+)/i)?.[1]).filter((x):x is string=>!!x&&host(x)===DOMAIN))]}
function hrefs(html:string,base:string){
  const out:string[]=[];
  for(const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)){
    try{out.push(new URL(m[1].replace(/&amp;/g,"&"),base).toString())}catch{}
  }
  return out;
}
function isSeed(raw:string){
  try{
    const u=new URL(raw); if(host(raw)!==DOMAIN) return false;
    return /^\/fr\/[^/]+\/(?:vendre|louer)\/[^/]+\/?$/.test(u.pathname);
  }catch{return false}
}
function isDetail(raw:string){
  try{
    const u=new URL(raw); if(host(raw)!==DOMAIN) return false;
    return /^\/fr\/[^/]+\/(?:vendre|louer)\/[^/]+\/\d+\/[^/?]+\/?$/.test(u.pathname);
  }catch{return false}
}
function listingId(raw:string){
  const u=new URL(raw); const seg=u.pathname.split("/").filter(Boolean); return seg[4] ?? null;
}
async function loadSeeds(){
  const robots=await fetchText(`https://${DOMAIN}/robots.txt`);
  if(!robots) throw new Error("robots unavailable");
  const q=robotsRoots(robots), seen=new Set<string>(), seeds=new Set<string>();
  while(q.length&&seen.size<100){
    const s=q.shift()!; if(seen.has(s)) continue; seen.add(s);
    const x=await fetchText(s); await sleep(PACE); if(!x) continue;
    const ls=locs(x);
    if(isIndex(x)){for(const c of ls) if(host(c)===DOMAIN&&!seen.has(c)) q.push(c)}
    else for(const u of ls) if(isSeed(u)) seeds.add(u.replace(/\/$/,""));
  }
  return [...seeds].sort();
}
async function main(){
  const seeds=await loadSeeds();
  const queue=[...seeds], seenPages=new Set<string>(), detailUrls=new Set<string>(), ids=new Set<string>();
  let fetchFailures=0;
  while(queue.length && seenPages.size<MAX_CATEGORY_PAGES && detailUrls.size<MAX_DETAIL_URLS){
    const page=queue.shift()!;
    if(seenPages.has(page)) continue;
    seenPages.add(page);
    const html=await fetchText(page);
    await sleep(PACE);
    if(!html){fetchFailures++; continue}
    for(const h of hrefs(html,page)){
      if(isDetail(h)){
        const clean=h.split("#")[0]; detailUrls.add(clean);
        const id=listingId(clean); if(id) ids.add(id);
        continue;
      }
      try{
        const a=new URL(page), b=new URL(h);
        if(host(h)!==DOMAIN) continue;
        if(a.pathname===b.pathname && b.searchParams.has("page")){
          const n=Number(b.searchParams.get("page"));
          if(Number.isInteger(n)&&n>1&&n<=1000&&!seenPages.has(b.toString())) queue.push(b.toString());
        }
      }catch{}
    }
  }
  const urls=[...detailUrls].sort();
  const dir=resolve("data/audits/raw-results"); mkdirSync(dir,{recursive:true});
  const body=urls.join("\n")+(urls.length?"\n":"");
  writeFileSync(resolve(dir,"recovery-domio-category-detail-urls.txt"),body);
  const summary={
    schema_version:"akarfinder-recovery-domio-category-v1",
    domain:DOMAIN,
    seed_category_urls:seeds.length,
    category_pages_fetched:seenPages.size,
    fetch_failures:fetchFailures,
    unique_detail_urls:urls.length,
    unique_listing_ids:ids.size,
    database_access:0,
    database_writes:0,
    listing_detail_page_fetches:0,
    approved_for_import_rows:0,
    sha256:createHash("sha256").update(body).digest("hex")
  };
  writeFileSync(resolve(dir,"recovery-domio-category-detail-summary.json"),JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});