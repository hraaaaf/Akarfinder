import { writeFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const USER_AGENT="AkarFinderRecoveryAudit";
const sql = neon(process.env.DATABASE_URL);
const limit = Math.max(1, Math.min(300, Number(process.env.SAMPLE_SIZE || 120)));
const rows = await sql`
  SELECT p.id,p.title,p.price_mad,p.surface_m2,p.city,p.district,p.property_type,
         p.transaction_type,p.rooms_count,p.bedrooms_count,p.bathrooms_count,
         s.listing_url
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
  WHERE lower(s.source_name)='marocimmo.com'
    AND (p.price_mad IS NULL OR p.surface_m2 IS NULL OR p.district IS NULL
         OR p.rooms_count IS NULL OR p.bedrooms_count IS NULL OR p.bathrooms_count IS NULL)
    AND s.listing_url IS NOT NULL
  ORDER BY md5(p.id::text)
  LIMIT ${limit}
`;

const amountRe=/([0-9]{1,3}(?:[ .,'’][0-9]{3})+|[0-9]{4,10})\s*(?:mad|dhs?|dh|dirhams?)/giu;
const surfaceRe=/([0-9]{1,7})\s*m(?:²|2)\b/giu;
const patterns={
  bedrooms:[/(?:chambres?|bedrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:chambres?|bedrooms?)\b/giu],
  bathrooms:[/(?:salles?\s*de\s*bain|sdb|bathrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:salles?\s*de\s*bain|sdb|bathrooms?)\b/giu],
  rooms:[/(?:pi[eè]ces?|rooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:pi[eè]ces?|rooms?)\b/giu],
};
function unique(re,text){re.lastIndex=0;return [...new Set([...text.matchAll(re)].map(m=>Number(m[1].replace(/[^0-9]/g,''))).filter(Number.isFinite))];}
function one(re,text){const v=unique(re,text);return v.length===1?v[0]:null;}
function oneAny(res,text){const v=[...new Set(res.flatMap(re=>unique(re,text)))];return v.length===1?v[0]:null;}
function extract(html){
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
 const prices=unique(amountRe,text).filter(x=>x>=100&&x<=500000000);
 return {price_mad:prices.length===1?prices[0]:null,price_candidates:prices.length,
   surface_m2:one(surfaceRe,text),bedrooms_count:oneAny(patterns.bedrooms,text),
   bathrooms_count:oneAny(patterns.bathrooms,text),rooms_count:oneAny(patterns.rooms,text)};
}

const robotsCache=new Map();
function parseRobots(text){
 const lines=text.split(/\r?\n/).map(x=>x.replace(/#.*/,'').trim()).filter(Boolean);
 const groups=[]; let current=null;
 for(const line of lines){
  const i=line.indexOf(':'); if(i<0) continue;
  const key=line.slice(0,i).trim().toLowerCase(), value=line.slice(i+1).trim();
  if(key==='user-agent'){
    if(!current || current.rules.length) {current={agents:[],rules:[]};groups.push(current);}
    current.agents.push(value.toLowerCase());
  } else if(current && (key==='allow'||key==='disallow')) current.rules.push({kind:key,path:value});
 }
 return groups;
}
async function robotsFor(url){
 const origin=new URL(url).origin;
 if(robotsCache.has(origin)) return robotsCache.get(origin);
 try{
  const res=await fetch(origin+'/robots.txt',{signal:AbortSignal.timeout(5000),headers:{"user-agent":USER_AGENT+"/1.0"}});
  if(res.status===404||res.status===410){const v={state:'absent',groups:[]};robotsCache.set(origin,v);return v;}
  if(!res.ok){const v={state:'unknown',groups:[]};robotsCache.set(origin,v);return v;}
  const v={state:'loaded',groups:parseRobots(await res.text())};robotsCache.set(origin,v);return v;
 }catch{const v={state:'unknown',groups:[]};robotsCache.set(origin,v);return v;}
}
function robotsAllows(url,robots){
 if(robots.state==='absent') return true;
 if(robots.state!=='loaded') return false;
 const ua=USER_AGENT.toLowerCase(), path=new URL(url).pathname||'/';
 const specific=robots.groups.filter(g=>g.agents.some(a=>a===ua));
 const groups=specific.length?specific:robots.groups.filter(g=>g.agents.includes('*'));
 if(!groups.length) return true;
 const matches=groups.flatMap(g=>g.rules).filter(r=>r.path && path.startsWith(r.path));
 if(!matches.length) return true;
 matches.sort((a,b)=>b.path.length-a.path.length);
 return matches[0].kind==='allow';
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const results=[];
for(const r of rows){
 const started=Date.now();
 const robots=await robotsFor(r.listing_url);
 if(!robotsAllows(r.listing_url,robots)){
  results.push({id:r.id,url:r.listing_url,robots:robots.state,robots_allowed:false,http_status:null,accessible:false,elapsed_ms:Date.now()-started,extracted:null});
  continue;
 }
 try{
  const res=await fetch(r.listing_url,{redirect:"follow",signal:AbortSignal.timeout(8000),headers:{"user-agent":USER_AGENT+"/1.0 (+read-only benchmark)","accept":"text/html"}});
  const ct=res.headers.get("content-type")||"";
  const html=res.ok&&ct.includes("text/html")?await res.text():"";
  results.push({id:r.id,url:r.listing_url,robots:robots.state,robots_allowed:true,http_status:res.status,accessible:res.ok&&html.length>0,
    elapsed_ms:Date.now()-started,extracted:html?extract(html):null});
 }catch(e){results.push({id:r.id,url:r.listing_url,robots:robots.state,robots_allowed:true,http_status:null,accessible:false,elapsed_ms:Date.now()-started,error:e?.name||"fetch_error",extracted:null});}
 await sleep(250);
}
const fields=["price_mad","surface_m2","bedrooms_count","bathrooms_count","rooms_count"];
const summary={source:"marocimmo.com",sample_requested:limit,sample_size:results.length,
 robots_allowed:results.filter(x=>x.robots_allowed).length,robots_blocked:results.filter(x=>x.robots_allowed===false).length,
 accessible:results.filter(x=>x.accessible).length,http_statuses:{},recovered:{},ambiguous_price:0,
 note:"Read-only bounded benchmark; robots.txt fail-closed; extracted values are candidates only and are not written to Neon."};
for(const x of results){const k=String(x.http_status??(x.robots_allowed===false?"robots_blocked":"error"));summary.http_statuses[k]=(summary.http_statuses[k]||0)+1;
 if(x.extracted){for(const field of fields)if(x.extracted[field]!=null)summary.recovered[field]=(summary.recovered[field]||0)+1;if(x.extracted.price_candidates>1)summary.ambiguous_price++;}}
await writeFile("marocimmo-recovery-benchmark.json",JSON.stringify(summary,null,2)+"\n");
await writeFile("marocimmo-recovery-benchmark.jsonl",results.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log(JSON.stringify(summary,null,2));
