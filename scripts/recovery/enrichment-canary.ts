#!/usr/bin/env tsx
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type SeedFile={schema_version:string;sources:Array<{domain:string;urls:string[]}>};
const seeds=JSON.parse(readFileSync("data/recovery/enrichment-canary-seeds-v1.json","utf8")) as SeedFile;
const UA="AkarFinder-Recovery-EnrichmentCanary/1.0";
const TIMEOUT=15000;
const PACE_MS=1200;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

function host(raw:string){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return null}}
function decodeHtml(s:string){return s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")}
function meta(html:string,key:string){
  const quoted=key.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
  const p1=new RegExp('<meta[^>]+(?:property|name)=["\\']'+quoted+'["\\'][^>]+content=["\\']([^"\\']*)["\\']','i');
  const p2=new RegExp('<meta[^>]+content=["\\']([^"\\']*)["\\'][^>]+(?:property|name)=["\\']'+quoted+'["\\']','i');
  const m=html.match(p1)||html.match(p2); return m?.[1]?decodeHtml(m[1].trim()):null;
}
function titleTag(html:string){const m=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);return m?.[1]?decodeHtml(m[1].replace(/\s+/g," ").trim()):null}
function jsonLd(html:string){
  const out:any[]=[];
  for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{const x=JSON.parse(m[1].trim());Array.isArray(x)?out.push(...x):out.push(x)}catch{}
  }
  return out;
}
function flatten(nodes:any[]){const out:any[]=[];const walk=(x:any)=>{if(!x||typeof x!=="object")return;if(Array.isArray(x)){x.forEach(walk);return}out.push(x);if(x["@graph"])walk(x["@graph"])};nodes.forEach(walk);return out}
function first(nodes:any[],keys:string[]){
  for(const n of flatten(nodes))for(const k of keys){
    const v=n?.[k]; if(typeof v==="string"||typeof v==="number")return String(v);
    if(v&&typeof v==="object")for(const sk of ["value","name","price"])if(typeof v[sk]==="string"||typeof v[sk]==="number")return String(v[sk]);
  }
  return null;
}
function robotsDecision(txt:string,path:string){
  const lines=txt.split(/\r?\n/).map(l=>l.replace(/#.*/,"").trim()).filter(Boolean);
  let applies=false; const dis:string[]=[]; const allow:string[]=[];
  for(const line of lines){
    const i=line.indexOf(":"); if(i<0)continue;
    const key=line.slice(0,i).trim().toLowerCase(), val=line.slice(i+1).trim();
    if(key==="user-agent"){applies=val==="*";continue}
    if(!applies)continue;
    if((key==="disallow"||key==="allow")&&val){
      if(val.includes("*")||val.includes("$")) return "unknown";
      (key==="disallow"?dis:allow).push(val);
    }
  }
  const best=(arr:string[])=>arr.filter(x=>path.startsWith(x)).sort((a,b)=>b.length-a.length)[0]||null;
  const a=best(allow),d=best(dis); if(!d)return "allow"; if(a&&a.length>=d.length)return "allow"; return "deny";
}
async function fetchText(url:string){
  const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT);
  try{
    const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"}});
    return {ok:r.ok,status:r.status,final_url:r.url,text:await r.text()};
  }catch(e){return {ok:false,status:0,final_url:url,text:"",error:String(e)}}finally{clearTimeout(t)}
}
function address(nodes:any[]){
  for(const n of flatten(nodes)){const a=n?.address;if(typeof a==="string")return a;if(a&&typeof a==="object"){const v=[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode,a.addressCountry].filter(Boolean);if(v.length)return v.join(", ")}}
  return null;
}
async function main(){
  const results:any[]=[];
  for(const src of seeds.sources){
    const robots=await fetchText("https://"+src.domain+"/robots.txt");
    for(const url of src.urls){
      const path=new URL(url).pathname;
      const decision=robots.ok?robotsDecision(robots.text,path):"unknown";
      if(decision!=="allow"){
        results.push({domain:src.domain,url,robots_ok:robots.ok,robots_decision:decision,fetch_skipped:true,database_access:0,database_writes:0});
        continue;
      }
      const r=await fetchText(url), html=r.text, ld=jsonLd(html);
      results.push({
        domain:src.domain,url,robots_ok:true,robots_decision:decision,fetch_skipped:false,
        http_status:r.status,final_url:r.final_url,
        title:meta(html,"og:title")??titleTag(html)??first(ld,["name","headline"]),
        description:meta(html,"og:description")??meta(html,"description"),
        price:first(ld,["price","lowPrice","highPrice"])??meta(html,"product:price:amount"),
        currency:first(ld,["priceCurrency"])??meta(html,"product:price:currency"),
        address:address(ld),
        published_at:first(ld,["datePosted","datePublished","uploadDate","dateModified"]),
        jsonld_blocks:ld.length,database_access:0,database_writes:0
      });
      await sleep(PACE_MS);
    }
  }
  const by_domain:any={};
  for(const r of results){
    const x=by_domain[r.domain]??={samples:0,fetched:0,http_200:0,title:0,price:0,address:0,published_at:0,robots_skipped:0};
    x.samples++;if(r.fetch_skipped){x.robots_skipped++;continue}x.fetched++;
    if(r.http_status===200)x.http_200++;if(r.title)x.title++;if(r.price)x.price++;if(r.address)x.address++;if(r.published_at)x.published_at++;
  }
  const summary={schema_version:"akarfinder-enrichment-canary-v1",samples:results.length,by_domain,database_access:0,database_writes:0};
  const dir=resolve("data/audits/raw-results");mkdirSync(dir,{recursive:true});
  writeFileSync(resolve(dir,"recovery-enrichment-canary-results.json"),JSON.stringify(results,null,2)+"\n");
  writeFileSync(resolve(dir,"recovery-enrichment-canary-summary.json"),JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
