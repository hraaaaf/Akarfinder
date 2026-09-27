#!/usr/bin/env tsx
import { gunzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const DOMAIN="domio.ma";
const UA="AkarFinder-Recovery-Domio-Mass/1.0";
const TIMEOUT=15000, PACE=300, MAX_FILES=100, MAX_URLS=100000;
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
function roots(s:string){return [...new Set(s.split(/\r?\n/).map(l=>l.match(/^\s*Sitemap\s*:\s*(\S+)/i)?.[1]).filter((x):x is string=>!!x&&host(x)===DOMAIN))]}
function locs(x:string){return [...x.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,"&").trim())}
function isIndex(x:string){return /<sitemapindex\b/i.test(x)}
function parseDetail(raw:string){
 try{
  const u=new URL(raw); if(host(raw)!==DOMAIN) return null;
  const seg=u.pathname.split("/").filter(Boolean);
  if(seg.length<6) return null;
  const lang=seg[0];
  if(!["fr","en","nl","ar"].includes(lang)) return null;
  const action=seg[2];
  const actions:any={fr:["vendre","louer"],en:["sale","rent"],nl:["kopen","huren"],ar:["بيع","كراء"]};
  if(!actions[lang]?.includes(decodeURIComponent(action))) return null;
  const id=seg[4];
  if(!/^\d+$/.test(id)) return null;
  return {url:u.toString(),lang,id};
 }catch{return null}
}
async function main(){
 const robots=await fetchBuf(`https://${DOMAIN}/robots.txt`);
 if(!robots) throw new Error("robots unavailable");
 const q=[...roots(robots.toString("utf8"))], seenF=new Set<string>(), byUrl=new Map<string,any>(), ids=new Map<string,Set<string>>();
 let raw=0;
 while(q.length&&seenF.size<MAX_FILES&&raw<MAX_URLS){
  const s=q.shift()!; if(seenF.has(s)||host(s)!==DOMAIN) continue; seenF.add(s);
  const b=await fetchBuf(s); await sleep(PACE); if(!b) continue;
  let x=""; try{x=decode(b)}catch{continue}
  const ls=locs(x);
  if(isIndex(x)){for(const c of ls)if(host(c)===DOMAIN&&!seenF.has(c))q.push(c);continue}
  raw+=ls.length;
  for(const loc of ls){
    const d=parseDetail(loc); if(!d) continue;
    byUrl.set(d.url,d);
    if(!ids.has(d.id)) ids.set(d.id,new Set());
    ids.get(d.id)!.add(d.url);
  }
 }
 const rows=[...byUrl.values()].sort((a,b)=>a.url.localeCompare(b.url));
 const identity=[...ids.entries()].sort((a,b)=>Number(a[0])-Number(b[0])).map(([id,urls])=>({listing_id:id,urls:[...urls].sort()}));
 const dir=resolve("data/audits/raw-results"); mkdirSync(dir,{recursive:true});
 const body=rows.map(r=>JSON.stringify(r)).join("\n")+(rows.length?"\n":"");
 writeFileSync(resolve(dir,"recovery-domio-detail-urls.jsonl"),body);
 writeFileSync(resolve(dir,"recovery-domio-identities.jsonl"),identity.map(r=>JSON.stringify(r)).join("\n")+(identity.length?"\n":""));
 const langs=rows.reduce((a:any,r:any)=>(a[r.lang]=(a[r.lang]||0)+1,a),{});
 const summary={domain:DOMAIN,robots_ok:true,sitemap_files_fetched:seenF.size,raw_urls_seen:raw,unique_detail_urls:rows.length,unique_listing_ids:identity.length,language_counts:langs,database_access:0,database_writes:0,listing_page_fetches:0,approved_for_import_rows:0,sha256:createHash("sha256").update(body).digest("hex")};
 writeFileSync(resolve(dir,"recovery-domio-detail-summary.json"),JSON.stringify(summary,null,2)+"\n");
 console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});