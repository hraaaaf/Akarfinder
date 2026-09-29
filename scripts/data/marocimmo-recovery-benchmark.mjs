import { writeFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

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
const bedRe=/(?:chambres?|bedrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu;
const bathRe=/(?:salles?\s*de\s*bain|sdb|bathrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu;
const roomRe=/(?:pi[eè]ces?|rooms?)\s*[:=-]?\s*(\d{1,2})\b/giu;
function unique(re,text){return [...new Set([...text.matchAll(re)].map(m=>Number(m[1].replace(/[^0-9]/g,''))).filter(Number.isFinite))];}
function one(re,text){const v=unique(re,text);return v.length===1?v[0]:null;}
function extract(html){
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
 const prices=unique(amountRe,text).filter(x=>x>=100&&x<=500000000);
 return {price_mad:prices.length===1?prices[0]:null,price_candidates:prices.length,
   surface_m2:one(surfaceRe,text),bedrooms_count:one(bedRe,text),
   bathrooms_count:one(bathRe,text),rooms_count:one(roomRe,text)};
}
const results=[];
for(const r of rows){
 const started=Date.now();
 try{
  const res=await fetch(r.listing_url,{redirect:"follow",signal:AbortSignal.timeout(8000),headers:{"user-agent":"AkarFinderRecoveryAudit/1.0 (+read-only benchmark)","accept":"text/html"}});
  const ct=res.headers.get("content-type")||"";
  const html=res.ok&&ct.includes("text/html")?await res.text():"";
  results.push({id:r.id,url:r.listing_url,http_status:res.status,accessible:res.ok&&html.length>0,
    elapsed_ms:Date.now()-started,extracted:html?extract(html):null});
 }catch(e){results.push({id:r.id,url:r.listing_url,http_status:null,accessible:false,elapsed_ms:Date.now()-started,error:e?.name||"fetch_error",extracted:null});}
}
const fields=["price_mad","surface_m2","bedrooms_count","bathrooms_count","rooms_count"];
const summary={source:"marocimmo.com",sample_requested:limit,sample_size:results.length,
 accessible:results.filter(x=>x.accessible).length,http_statuses:{},recovered:{},ambiguous_price:0,
 note:"Read-only bounded benchmark; extracted values are candidates only and are not written to Neon."};
for(const x of results){const k=String(x.http_status??"error");summary.http_statuses[k]=(summary.http_statuses[k]||0)+1;
 if(x.extracted){for(const f of fields)if(x.extracted[f]!=null)summary.recovered[f]=(summary.recovered[f]||0)+1;if(x.extracted.price_candidates>1)summary.ambiguous_price++;}}
await writeFile("marocimmo-recovery-benchmark.json",JSON.stringify(summary,null,2)+"\n");
await writeFile("marocimmo-recovery-benchmark.jsonl",results.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log(JSON.stringify(summary,null,2));
