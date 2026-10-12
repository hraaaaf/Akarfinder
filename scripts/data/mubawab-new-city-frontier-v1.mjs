import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {load} from "cheerio";
import {robotsAllowed,extractMubawabResultCards} from "./mubawab-result-cards-v1.mjs";
import {accumulateCards} from "./mubawab-card-scale-v1.mjs";
const UA="AkarFinderCityFrontierV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["mubawab.ma","www.mubawab.ma"]);
export const SEEDS=[
 "https://www.mubawab.ma/fr/st/meknes/appartements-a-vendre",
 "https://www.mubawab.ma/fr/st/oujda/appartements-a-vendre"
];
const clean=x=>String(x||"").replace(/\s+/g," ").trim();
const category=raw=>{
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:"||!HOSTS.has(u.hostname.toLowerCase())||u.search||u.hash)return null;
  if(!/^\/fr\/st\/[a-z0-9-]+\/appartements-a-vendre\/?$/i.test(u.pathname))return null;
  u.hash="";return u.href;
 }catch{return null;}
};
export function linkedCityCategories(html,pageUrl,{limit=200}={}){
 const $=load(html),routes=new Set();
 for(const a of $("a[href]").toArray()){
  const href=$(a).attr("href");
  let target;try{target=new URL(href,pageUrl).href;}catch{continue;}
  const canonical=category(target);
  if(!canonical||canonical===pageUrl)continue;
  routes.add(canonical);
  if(routes.size>=limit)break;
 }
 return [...routes];
}
export function sourcePageCity(html){
 const $=load(html);
 const heading=clean($("h1").first().text());
 const m=heading.match(/^Appartements?\s+à\s+vendre\s+à\s+([\p{L}\p{M}\s\-']{2,45})$/iu);
 if(!m)return null;
 const city=clean(m[1]);
 return city.length>=2&&city.length<=45?city:null;
}
const sameCategory=(expected,observed)=>category(observed)!==null&&
 new URL(expected).pathname.replace(/\/+$/,"")===new URL(observed).pathname.replace(/\/+$/,"");
export async function crawlLinkedCityFrontier({
 fetchImpl=globalThis.fetch,robotsText=null,seeds=SEEDS,
 sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),paceMs=1800,maxPages=30,
 baselineIds=null
}={}){
 const quota=Math.max(1,Math.min(30,Math.floor(maxPages))),queued=new Set(seeds.map(category).filter(Boolean)),seen=new Set();
 const pages=[],collections=[];
 let robots=robotsText,halted=null,requests=0,catalogs=0,found=0;
 if(robots===null)try{
  const r=await fetchImpl("https://www.mubawab.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error("robots_http");
  robots=await r.text();if(!robots||robots.length>120000)throw Error("robots_missing");
 }catch{halted="robots_unavailable_fail_closed";}
 for(const url of queued){
  if(halted||requests>=quota)break;
  if(seen.has(url))continue;
  seen.add(url);
  if(!robotsAllowed(robots,url,UA)){pages.push({state:"robots_disallowed"});continue;}
  if(requests&&paceMs)await sleep(paceMs);
  requests++;
  let r;
  try{r=await fetchImpl(url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(20000)});}
  catch{pages.push({state:"fetch_error"});continue;}
  if(r.status===403||r.status===429){halted="http_"+r.status;pages.push({state:halted});break;}
  if(r.status!==200){pages.push({state:"http_"+r.status});continue;}
  if(!sameCategory(url,r.url)){pages.push({state:"redirect_or_untrusted_final"});continue;}
  if(!/html/i.test(r.headers?.get?.("content-type")||"")){pages.push({state:"non_html"});continue;}
  try{
   const html=await r.text();
   if(Buffer.byteLength(html,"utf8")>3000000){pages.push({state:"oversized"});continue;}
   const city=sourcePageCity(html);
   if(!city){pages.push({state:"missing_canonical_city_h1"});continue;}
   const discovered=linkedCityCategories(html,r.url);
   for(const candidate of discovered)if(queued.size<250&&!seen.has(candidate))queued.add(candidate);
   found+=discovered.length;
   const parsed=extractMubawabResultCards(html,r.url,city);
   catalogs++;
   collections.push({seed:{url,city},rows:parsed.rows});
   pages.push({city,state:"observed",unique_card_ids:parsed.rows.length,five_fields:parsed.five_field_present,discovered_city_links:discovered.length});
  }catch{pages.push({state:"parse_error"});}
 }
 const merged=accumulateCards(collections);
 const known=baselineIds instanceof Set?baselineIds:null;
 const netNew=known?merged.rows.filter(x=>!known.has(x.identity)).length:null;
 const newFive=known?merged.rows.filter(x=>x.five_field_observed&&!known.has(x.identity)).length:null;
 return {report:{schema_version:"AKARFINDER_MUBAWAB_NEW_CITY_FRONTIER_V1",
  semantics:"observed_public_category_cards_only_not_freshness_or_sale_certification",
  requested_max_pages:quota,category_requests:requests,category_pages_observed:catalogs,
  discovered_city_links:found,candidate_category_queue_size:queued.size,visited_category_urls:seen.size,
  halted_reason:halted,robots_checked:!!robots,
  source_ids:merged.unique,five_field_observed:merged.complete,
  net_new_source_ids_vs_ledger:netNew,net_new_five_field_vs_ledger:newFive,
  pages,database_access:0,database_writes:0,
  note:"Only verified H1 city and same-card values counted. No detail fetch. New vs ledger does NOT mean newly published or available."
 },rows:merged.rows};
}
async function main(){
 let baseline=null;
 if(process.env.CARD_LEDGER_JSONL){
  baseline=new Set();
  const data=await fs.readFile(process.env.CARD_LEDGER_JSONL,"utf8");
  for(const line of data.split(/\r?\n/)){
   if(!line)continue;const x=JSON.parse(line);
   if(x.source==="mubawab.ma")baseline.add(x.identity);
  }
 }
 const {report,rows}=await crawlLinkedCityFrontier({baselineIds:baseline});
 const out=process.env.OUTPUT_PREFIX||"mubawab-new-city-frontier";
 await fs.writeFile(out+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(out+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify({...report,pages:undefined},null,2));
 if(report.halted_reason||!report.category_pages_observed)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
