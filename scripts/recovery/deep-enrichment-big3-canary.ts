#!/usr/bin/env tsx
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Seed={url:string;source_listing_id:string|null;transaction_type:string|null;property_type:string|null};
type Source={domain:string;rows:Seed[]};
type SeedFile={schema_version:string;sources:Source[]};
const seeds=JSON.parse(readFileSync("data/recovery/deep-enrichment-big3-seeds-v1.json","utf8")) as SeedFile;
const UA="AkarFinder-Recovery-DeepCanary/1.0";
const TIMEOUT=20000;
const PACE_MS=1200;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

function decodeHtml(s:string){return s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")}
function meta(html:string,key:string){
  const q=key.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
  const a=new RegExp(`<meta[^>]+(?:property|name)=["']${q}["'][^>]+content=["']([^"']*)["']`,"i");
  const b=new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${q}["']`,"i");
  const m=html.match(a)||html.match(b); return m?.[1]?decodeHtml(m[1].trim()):null;
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
    const v=n?.[k]; if(typeof v==="string"||typeof v==="number")return v;
    if(v&&typeof v==="object")for(const sk of ["value","name","price"])if(typeof v[sk]==="string"||typeof v[sk]==="number")return v[sk];
  } return null;
}
function address(nodes:any[]){
  for(const n of flatten(nodes)){const a=n?.address;if(typeof a==="string")return a;if(a&&typeof a==="object"){const v=[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode,a.addressCountry].filter(Boolean);if(v.length)return v.join(", ")}}
  return null;
}
function robotsDecision(txt:string,path:string){
  const lines=txt.split(/\r?\n/).map(l=>l.replace(/#.*/,"").trim()).filter(Boolean);
  let applies=false; const dis:string[]=[]; const allow:string[]=[];
  for(const line of lines){const i=line.indexOf(":");if(i<0)continue;const k=line.slice(0,i).trim().toLowerCase(),v=line.slice(i+1).trim();
    if(k==="user-agent"){applies=v==="*";continue} if(!applies)continue;
    if((k==="disallow"||k==="allow")&&v){if(v.includes("*")||v.includes("$"))return "unknown";(k==="disallow"?dis:allow).push(v)}
  }
  const best=(a:string[])=>a.filter(x=>path.startsWith(x)).sort((x,y)=>y.length-x.length)[0]||null;
  const a=best(allow),d=best(dis);if(!d)return "allow";if(a&&a.length>=d.length)return "allow";return "deny";
}
async function fetchText(url:string){
  const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT);
  try{const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"}});
    return {ok:r.ok,status:r.status,final_url:r.url,text:await r.text()}
  }catch(e){return {ok:false,status:0,final_url:url,text:"",error:String(e)}}finally{clearTimeout(t)}
}
function cleanNum(s:string){const x=s.replace(/[\s\u202f\u00a0,]/g,"");const n=Number(x);return Number.isFinite(n)?n:null}
function textPrice(text:string){
  const ms=[...text.matchAll(/(?:prix[^\d]{0,20})?([0-9][0-9\s\u202f\u00a0,.]{2,})\s*(?:dh|mad)\b/gi)];
  const vals=ms.map(m=>cleanNum(m[1])).filter((x):x is number=>x!==null&&x>=100&&x<=1_000_000_000);
  return vals.length?Math.max(...vals):null;
}
function textSurface(text:string){
  const ms=[...text.matchAll(/([0-9][0-9\s,.]{0,8})\s*m(?:²|2)\b/gi)];
  const vals=ms.map(m=>cleanNum(m[1])).filter((x):x is number=>x!==null&&x>=5&&x<=100000);
  return vals.length?Math.max(...vals):null;
}
function bedrooms(text:string){
  const m=text.match(/(\d{1,2})\s*(?:chambres?|bedrooms?)\b/i);return m?Number(m[1]):null;
}
function cityDistrictFromUrl(raw:string){
  const p=new URL(raw).pathname.split("/").filter(Boolean);
  if(p[0]==="fr"||p[0]==="ar"||p[0]==="en"){
    if(p[1]==="annonce") return {city:null,district:null};
    if(["location","vente"].includes(p[1])) return {city:p[3]||null,district:p[4]||null};
    if(["appartement","villa","terrain","bureau","local"].includes(p[1])) return {city:p[3]||null,district:p[4]||null};
  }
  return {city:null,district:null};
}
async function main(){
  const results:any[]=[]; const summaries:any={};
  for(const src of seeds.sources){
    const robots=await fetchText("https://"+src.domain+"/robots.txt");
    const sum=summaries[src.domain]={samples:0,fetched:0,http_200:0,title:0,description:0,price:0,surface:0,address:0,published_at:0,city:0,district:0,bedrooms:0,robots_skipped:0,failed:0};
    for(const seed of src.rows){
      sum.samples++;
      const decision=robots.ok?robotsDecision(robots.text,new URL(seed.url).pathname):"unknown";
      if(decision!=="allow"){sum.robots_skipped++;results.push({...seed,domain:src.domain,robots_decision:decision,fetch_skipped:true});continue}
      const r=await fetchText(seed.url); if(!r.ok)sum.failed++; else sum.fetched++; if(r.status===200)sum.http_200++;
      const html=r.text,ld=jsonLd(html),title=meta(html,"og:title")??titleTag(html)??String(first(ld,["name","headline"])??"")||null;
      const description=meta(html,"og:description")??meta(html,"description");
      const combined=[title,description].filter(Boolean).join(" ");
      const urlGeo=cityDistrictFromUrl(r.final_url||seed.url);
      const addr=address(ld);
      let price=first(ld,["price","lowPrice","highPrice"]);
      if(price!==null)price=Number(price); if(!Number.isFinite(price as number)||Number(price)<=0)price=textPrice(combined);
      const surface=textSurface(combined);
      const published=first(ld,["datePosted","datePublished","uploadDate","dateModified"]);
      let city=urlGeo.city,district=urlGeo.district;
      if(addr){const parts=String(addr).split(",").map(x=>x.trim()).filter(Boolean); if(parts.length)city=city||parts[0]}
      const row={...seed,domain:src.domain,robots_decision:decision,fetch_skipped:false,http_status:r.status,final_url:r.final_url,title,description,price_mad:price??null,surface_m2:surface,address:addr,published_at:published,city,district,bedrooms_count:bedrooms(combined),jsonld_blocks:ld.length,database_access:0,database_writes:0};
      results.push(row);
      for(const k of ["title","description","price_mad","surface_m2","address","published_at","city","district","bedrooms_count"])if((row as any)[k]!==null&&(row as any)[k]!=="")sum[k==="price_mad"?"price":k==="surface_m2"?"surface":k==="bedrooms_count"?"bedrooms":k]++;
      await sleep(PACE_MS);
    }
  }
  const out=resolve("data/audits/raw-results");mkdirSync(out,{recursive:true});
  writeFileSync(resolve(out,"deep-enrichment-big3-results-v1.json"),JSON.stringify(results,null,2)+"\n");
  writeFileSync(resolve(out,"deep-enrichment-big3-summary-v1.json"),JSON.stringify({schema_version:"akarfinder-deep-enrichment-big3-summary-v1",by_domain:summaries,database_access:0,database_writes:0},null,2)+"\n");
  console.log(JSON.stringify(summaries,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
