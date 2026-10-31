import fs from "node:fs/promises";
import { extractMubawabResultCards, robotsAllowed } from "./mubawab-result-cards-v1.mjs";

const UA="AkarFinderResultCardPilot/1.0 (+https://akarfinder.ma)";
const SEEDS=[
 {city:"Casablanca",url:"https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre"},
 {city:"Rabat",url:"https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre"},
 {city:"Casablanca",url:"https://www.mubawab.ma/fr/st/casablanca/appartements-a-louer"},
 {city:"Rabat",url:"https://www.mubawab.ma/fr/st/rabat/appartements-a-louer"},
 {city:"Marrakech",url:"https://www.mubawab.ma/fr/st/marrakech/appartements-a-vendre"},
 {city:"Tanger",url:"https://www.mubawab.ma/fr/st/tanger/appartements-a-vendre"},
 {city:"Agadir",url:"https://www.mubawab.ma/fr/st/agadir/appartements-a-vendre"},
 {city:"Casablanca",url:"https://www.mubawab.ma/fr/st/casablanca/maisons-a-vendre"}
];
const outPrefix=process.env.OUTPUT_PREFIX||"mubawab-card-first-pilot";
const observations=[],ids=new Map();
const robotCache=new Map();
for(const seed of SEEDS){
 const url=new URL(seed.url);
 let robots=robotCache.get(url.origin);
 if(!robots){
  try{
   const r=await fetch(url.origin+"/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw Error("robots_http_"+r.status);
   robots=await r.text();
   robotCache.set(url.origin,robots);
  }catch(e){
   observations.push({url:seed.url,city:seed.city,fetch_state:"robots_unavailable_fail_closed",reason:String(e?.message||e)});
   continue;
  }
 }
 if(!robotsAllowed(robots,seed.url,UA)){
  observations.push({url:seed.url,city:seed.city,fetch_state:"robots_disallowed"});
  continue;
 }
 try{
  const r=await fetch(seed.url,{headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(18000)});
  if(!r.ok){
   observations.push({url:seed.url,city:seed.city,fetch_state:"http_"+r.status});
   if(r.status===429||r.status===403)break;
   continue;
  }
  const contentType=r.headers.get("content-type")||"";
  if(!/html/i.test(contentType)){observations.push({url:seed.url,city:seed.city,fetch_state:"non_html"});continue;}
  const html=await r.text();
  // Do not persist HTML, contact details or extra source text.
  const cards=extractMubawabResultCards(html,r.url,seed.city);
  const {rows,...metrics}=cards;
  observations.push({url:seed.url,city:seed.city,fetch_state:"http_200",final_url_same_category:new URL(r.url).pathname===url.pathname,...metrics});
  for(const row of rows){
   if(!ids.has(row.identity))ids.set(row.identity,row);
  }
 }catch(e){
  observations.push({url:seed.url,city:seed.city,fetch_state:"fetch_error",reason:String(e?.message||e)});
 }
 await new Promise(resolve=>setTimeout(resolve,1250));
}
const rows=[...ids.values()];
const complete=rows.filter(x=>x.five_field_present);
const report={
 schema_version:"AKARFINDER_MUBAWAB_CARD_FIRST_PILOT_V1",
 semantics:"card_only_observed_not_freshness_or_source_detail_certified",
 observed_page_count:observations.filter(x=>x.fetch_state==="http_200").length,
 requested_page_count:SEEDS.length,
 observed_unique_cards:rows.length,
 observed_unique_five_field:complete.length,
 observed_five_field_pct:rows.length?Number((complete.length*100/rows.length).toFixed(2)):0,
 pages:observations,
 database_access:0,database_writes:0,
 note:"No detail requests. Card data may be promotional, stale, or duplicated with other sites; not promotable without separate freshness, primary/card verification, rights and cross-source dedup."
};
await fs.writeFile(outPrefix+".json",JSON.stringify(report,null,2)+"\n");
await fs.writeFile(outPrefix+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log(JSON.stringify(report,null,2));
if(!report.observed_page_count)process.exitCode=2;
