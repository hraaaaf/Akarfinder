#!/usr/bin/env tsx
import { gunzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const D="domio.ma", UA="AkarFinder-Recovery-Domio-RouteShape/1.0", TIMEOUT=15000, PACE=250;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function host(u:string){try{return new URL(u).hostname.toLowerCase().replace(/^www\./,"")}catch{return null}}
async function get(url:string){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT);try{const r=await fetch(url,{signal:c.signal,redirect:"follow",headers:{"user-agent":UA}});if(!r.ok||host(url)!==host(r.url||url))return null;return Buffer.from(await r.arrayBuffer())}catch{return null}finally{clearTimeout(t)}}
function dec(b:Buffer){const x=b.length>1&&b[0]===0x1f&&b[1]===0x8b?gunzipSync(b):b;return x.toString("utf8")}
function locs(x:string){return [...x.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,"&").trim())}
function idx(x:string){return /<sitemapindex\b/i.test(x)}
async function main(){
 const rb=await get(`https://${D}/robots.txt`); if(!rb) throw new Error("robots");
 const roots=[...new Set(rb.toString().split(/\r?\n/).map(l=>l.match(/^\s*Sitemap\s*:\s*(\S+)/i)?.[1]).filter((x):x is string=>!!x&&host(x)===D))];
 const q=[...roots],seen=new Set<string>(),urls:string[]=[];
 while(q.length&&seen.size<100){const s=q.shift()!;if(seen.has(s))continue;seen.add(s);const b=await get(s);await sleep(PACE);if(!b)continue;let x="";try{x=dec(b)}catch{continue}const ls=locs(x);if(idx(x)){for(const c of ls)if(host(c)===D&&!seen.has(c))q.push(c)}else for(const u of ls)if(host(u)===D)urls.push(u)}
 const depth=new Map<number,number>(), numeric:any[]=[], hex:any[]=[], long:any[]=[];
 for(const raw of urls){
   const u=new URL(raw); const seg=u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
   depth.set(seg.length,(depth.get(seg.length)||0)+1);
   if(seg.some(s=>/^\d{3,}$/.test(s))) numeric.push({path:u.pathname,segments:seg});
   if(seg.some(s=>/^[a-f0-9]{6,}$/i.test(s)&&/[a-f]/i.test(s))) hex.push({path:u.pathname,segments:seg});
   if(seg.length>=5) long.push({path:u.pathname,segments:seg});
 }
 const out={domain:D,total_urls:urls.length,depth_counts:[...depth.entries()].sort((a,b)=>a[0]-b[0]),numeric_segment_count:numeric.length,hex_segment_count:hex.length,depth_ge_5_count:long.length,numeric_samples:numeric.slice(0,200),hex_samples:hex.slice(0,100),long_samples:long.slice(0,200),database_access:0,database_writes:0,listing_page_fetches:0};
 const dir=resolve("data/audits/raw-results");mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,"recovery-domio-route-shape.json"),JSON.stringify(out,null,2)+"\n");console.log(JSON.stringify({total_urls:out.total_urls,depth_counts:out.depth_counts,numeric_segment_count:out.numeric_segment_count,hex_segment_count:out.hex_segment_count,depth_ge_5_count:out.depth_ge_5_count},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});