#!/usr/bin/env tsx
import { gunzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAINS=["domio.ma","yakeey.com","portail-immobilier.ma"] as const;
const UA="AkarFinder-Recovery-Wave4-Scout/1.0";
const TIMEOUT=15000, PACE=350, MAX_FILES=500, MAX_URLS=500000;
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
function decode(b:Buffer){const x=b.length>1&&b[0]===0x1f&&b[1]===0x8b?gunzipSync(b):b;return x.toString("utf8")}
function sitemapRoots(s:string,d:string){return [...new Set([...s.split(/\r?\n/)].map(l=>l.match(/^\s*Sitemap\s*:\s*(\S+)/i)?.[1]).filter((x):x is string=>!!x&&host(x)===d))]}
function locs(x:string){return [...x.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,"&").trim())}
function isIndex(x:string){return /<sitemapindex\b/i.test(x)}
function pathOf(u:string){try{return new URL(u).pathname}catch{return ""}}

async function scan(domain:string){
 const robots=await fetchBuf(`https://${domain}/robots.txt`);
 if(!robots)return {domain,robots_ok:false,declared_sitemaps:0,files:0,raw_urls:0,unique_urls:0,sample_paths:[]};
 const roots=sitemapRoots(robots.toString("utf8"),domain),q=[...roots],seenF=new Set<string>(),urls=new Set<string>();
 while(q.length&&seenF.size<MAX_FILES&&urls.size<MAX_URLS){
  const u=q.shift()!;if(seenF.has(u)||host(u)!==domain)continue;seenF.add(u);
  const b=await fetchBuf(u);await sleep(PACE);if(!b)continue;
  let x="";try{x=decode(b)}catch{continue}
  const ls=locs(x);
  if(isIndex(x)){for(const c of ls)if(host(c)===domain&&!seenF.has(c)&&q.length+seenF.size<MAX_FILES)q.push(c);continue}
  for(const c of ls)if(host(c)===domain)urls.add(c);
 }
 const paths=[...urls].map(pathOf);
 const prefixCounts=new Map<string,number>();
 for(const p of paths){
  const seg=p.split("/").filter(Boolean).slice(0,3).join("/");
  prefixCounts.set(seg,(prefixCounts.get(seg)||0)+1);
 }
 const top=[...prefixCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([prefix,count])=>({prefix,count}));
 return {domain,robots_ok:true,declared_sitemaps:roots.length,files:seenF.size,raw_urls:urls.size,unique_urls:urls.size,top_prefixes:top,sample_paths:paths.slice(0,100)};
}
async function main(){
 const out=[];for(const d of DOMAINS)out.push(await scan(d));
 const dir=resolve("data/audits/raw-results");mkdirSync(dir,{recursive:true});
 writeFileSync(resolve(dir,"recovery-wave4-sitemap-scout.json"),JSON.stringify({mode:"metadata_only",database_access:0,database_writes:0,listing_page_fetches:0,results:out},null,2)+"\n");
 console.log(JSON.stringify(out,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});