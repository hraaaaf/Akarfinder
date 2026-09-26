#!/usr/bin/env tsx
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN="domio.ma";
const UA="AkarFinder-Recovery-DomioPilot/1.0";
const PACE_MS=900;
const TIMEOUT_MS=15000;
const TARGET=500;
const CATEGORY_SEEDS=[
  "https://domio.ma/fr/appartement/louer/agadir",
  "https://domio.ma/fr/appartement/louer/casablanca"
];

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function fetchText(url:string){
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),TIMEOUT_MS);
  try{
    const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"}});
    return {ok:r.ok,status:r.status,final_url:r.url,text:await r.text()};
  }catch(e){return {ok:false,status:0,final_url:url,text:"",error:String(e)}}finally{clearTimeout(t)}
}

function host(raw:string){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"")}catch{return null}}
function hrefs(html:string,base:string){
  const out:string[]=[];
  for(const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)){
    try{out.push(new URL(m[1].replace(/&amp;/g,"&"),base).toString())}catch{}
  }
  return out;
}
function isDetail(raw:string){
  try{
    const u=new URL(raw);
    return host(raw)===DOMAIN && /^\/fr\/[^/]+\/(?:vendre|louer)\/[^/]+\/\d+\/[^/?]+\/?$/.test(u.pathname);
  }catch{return false}
}
function detailId(raw:string){
  const s=new URL(raw).pathname.split("/").filter(Boolean);
  return s[4] ?? null;
}
function cityFromUrl(raw:string){return new URL(raw).pathname.split("/").filter(Boolean)[3] ?? null}
function txFromUrl(raw:string){return new URL(raw).pathname.split("/").filter(Boolean)[2]==="louer"?"rent":"sale"}
function typeFromUrl(raw:string){return new URL(raw).pathname.split("/").filter(Boolean)[1] ?? null}
function decodeHtml(s:string){return s.replace(/&quot;/g,'"').replace(/&#39;|&#0*39;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")}
function meta(html:string,key:string){
  const q=key.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
  const p1=new RegExp(`<meta[^>]+(?:property|name)=["']${q}["'][^>]+content=["']([^"']*)["']`,"i");
  const p2=new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${q}["']`,"i");
  const m=html.match(p1)||html.match(p2);
  return m?.[1]?decodeHtml(m[1].trim()):null;
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
    const v=n?.[k];
    if(typeof v==="string"||typeof v==="number") return String(v);
    if(v&&typeof v==="object") for(const sk of ["value","name","price"]) if(typeof v[sk]==="string"||typeof v[sk]==="number") return String(v[sk]);
  }
  return null;
}
function address(nodes:any[]){
  for(const n of flatten(nodes)){
    const a=n?.address;
    if(typeof a==="string")return a;
    if(a&&typeof a==="object"){
      const v=[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode,a.addressCountry].filter(Boolean);
      if(v.length)return v.join(", ");
    }
  }
  return null;
}
function surface(text:string|null){
  if(!text)return null;
  const m=text.match(/(\d{2,4}(?:[.,]\d+)?)\s*m(?:²|2)\b/i);
  return m?Math.round(Number(m[1].replace(",","."))):null;
}
function bedrooms(text:string|null){
  if(!text)return null;
  const m=text.match(/(\d{1,2})\s*(?:chambre|chambres|bedroom|bedrooms)\b/i);
  return m?Number(m[1]):null;
}
function freshness(dateRaw:string|null){
  if(!dateRaw)return {ok:false,days:null};
  const ts=Date.parse(dateRaw); if(!Number.isFinite(ts))return {ok:false,days:null};
  const now=Date.now(); const days=Math.floor((now-ts)/86400000);
  return {ok:days>=-2 && days<=365,days};
}
function canonicalFingerprint(sourceId:string){
  return createHash("sha256").update(`domio.ma|${sourceId}`).digest("hex");
}

async function discover(){
  const out=new Map<string,string>();
  for(const seed of CATEGORY_SEEDS){
    const queue=[seed]; const seen=new Set<string>();
    while(queue.length && out.size<TARGET){
      const page=queue.shift()!; if(seen.has(page))continue; seen.add(page);
      const r=await fetchText(page); await sleep(PACE_MS);
      if(!r.ok)continue;
      for(const h of hrefs(r.text,page)){
        if(isDetail(h)){
          const id=detailId(h); if(id&&!out.has(id))out.set(id,h.split("#")[0]);
          continue;
        }
        try{
          const a=new URL(seed),b=new URL(h);
          if(host(h)!==DOMAIN || a.pathname!==b.pathname)continue;
          const n=Number(b.searchParams.get("page"));
          if(Number.isInteger(n)&&n>1&&n<=1000&&!seen.has(b.toString()))queue.push(b.toString());
        }catch{}
      }
    }
    if(out.size>=TARGET)break;
  }
  return [...out.entries()].slice(0,TARGET).map(([source_listing_id,url])=>({source_listing_id,url}));
}

async function main(){
  const discovered=await discover();
  if(discovered.length<TARGET)throw new Error(`pilot discovery shortfall: ${discovered.length}/${TARGET}`);

  const approved:any[]=[]; const rejected:any[]=[];
  for(const seed of discovered){
    const r=await fetchText(seed.url); await sleep(PACE_MS);
    if(r.status!==200){
      rejected.push({...seed,reason:`http_${r.status}`}); continue;
    }
    const ld=jsonLd(r.text);
    const title=meta(r.text,"og:title")??titleTag(r.text)??first(ld,["name","headline"]);
    const description=meta(r.text,"og:description")??meta(r.text,"description");
    const priceRaw=first(ld,["price","lowPrice","highPrice"])??meta(r.text,"product:price:amount");
    const priceNum=priceRaw!=null?Number(String(priceRaw).replace(/[^0-9.,-]/g,"").replace(",",".")):NaN;
    const price_mad=Number.isFinite(priceNum)&&priceNum>0?Math.round(priceNum):null;
    const published_at=first(ld,["datePosted","datePublished","uploadDate","dateModified"]);
    const f=freshness(published_at);
    const city=cityFromUrl(seed.url);
    const property_type=typeFromUrl(seed.url);
    const transaction_type=txFromUrl(seed.url);
    const addr=address(ld);
    const combined=[title,description].filter(Boolean).join(" ");
    let score=0;
    if(title&&title.length>=12)score+=25;
    if(city)score+=15;
    if(property_type)score+=15;
    if(transaction_type)score+=15;
    if(published_at&&f.ok)score+=15;
    if(addr)score+=10;
    if(price_mad!=null)score+=5;

    const base={
      canonical_fingerprint:canonicalFingerprint(seed.source_listing_id),
      source_listing_id:seed.source_listing_id,
      title,price_mad,city,district:null,property_type,transaction_type,
      surface_m2:surface(combined),rooms_count:null,bedrooms_count:bedrooms(combined),bathrooms_count:null,
      description_snippet:description?.slice(0,500)??null,images_count:null,seller_name:null,
      data_completeness_score:score,
      field_confidence:{source_listing_id:1,url:1,city:1,property_type:1,transaction_type:1,title:title?0.95:0,published_at:published_at?0.9:0,address:addr?0.9:0,price_mad:price_mad!=null?0.9:0},
      reliability_score:score,
      reliability_badge:score>=90?"high":score>=80?"medium":"low",
      reliability_reasons:["domio_http_200","domio_structured_detail",...(f.ok?["fresh_le_365d"]:[])],
      source_name:"domio.ma",
      listing_url:seed.url,
      source_url:"https://domio.ma",
      first_seen_at:new Date().toISOString(),
      last_seen_at:new Date().toISOString(),
      published_at,
      address:addr,
      freshness_days:f.days
    };

    const reasons:string[]=[];
    if(!title||title.length<12)reasons.push("missing_or_weak_title");
    if(!city)reasons.push("missing_city");
    if(!published_at)reasons.push("missing_published_at");
    if(!f.ok)reasons.push("stale_or_invalid_date");
    if(score<80)reasons.push("quality_below_80");

    if(reasons.length===0)approved.push(base);
    else rejected.push({...base,reasons});
  }

  const ids=new Set(approved.map(x=>x.source_listing_id));
  const fps=new Set(approved.map(x=>x.canonical_fingerprint));
  const urls=new Set(approved.map(x=>x.listing_url));
  if(ids.size!==approved.length||fps.size!==approved.length||urls.size!==approved.length)throw new Error("approved dedup invariant failed");

  const summary={
    schema_version:"akarfinder-domio-pilot-v1",
    discovered:discovered.length,
    approved:approved.length,
    rejected:rejected.length,
    approval_rate:approved.length/discovered.length,
    unique_ids:ids.size,
    unique_fingerprints:fps.size,
    unique_urls:urls.size,
    quality_min:approved.length?Math.min(...approved.map(x=>x.data_completeness_score)):null,
    quality_avg:approved.length?approved.reduce((s,x)=>s+x.data_completeness_score,0)/approved.length:null,
    database_access:0,database_writes:0,approved_for_import_rows:approved.length
  };

  const dir=resolve("data/audits/raw-results");mkdirSync(dir,{recursive:true});
  writeFileSync(resolve(dir,"domio-pilot-500-approved.jsonl"),approved.map(x=>JSON.stringify(x)).join("\n")+(approved.length?"\n":""));
  writeFileSync(resolve(dir,"domio-pilot-500-rejected.jsonl"),rejected.map(x=>JSON.stringify(x)).join("\n")+(rejected.length?"\n":""));
  writeFileSync(resolve(dir,"domio-pilot-500-summary.json"),JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));

  if(approved.length<350)throw new Error(`pilot approval too low: ${approved.length}/500`);
  if(summary.quality_min!=null && summary.quality_min<80)throw new Error("approved quality invariant failed");
}
main().catch(e=>{console.error(e);process.exit(1)});
