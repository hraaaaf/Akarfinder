import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {load} from "cheerio";
import {extractMubawabResultCards,robotsAllowed} from "./mubawab-result-cards-v1.mjs";
import {accumulateCards,categoryPlan} from "./mubawab-card-scale-v1.mjs";

const UA="AkarFinderNationalFrontierV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["www.mubawab.ma","mubawab.ma"]);
const TYPES=new Set(["ct","st"]);
const ROOTS=[
 "https://www.mubawab.ma/fr/cc/immobilier-a-vendre",
 "https://www.mubawab.ma/fr/cc/immobilier-a-louer"
];
const canonical=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[-_ ]+/g," ").toLowerCase();
const cityMap=new Map([
 ["casablanca","Casablanca"],["rabat","Rabat"],["marrakech","Marrakech"],["tanger","Tanger"],["agadir","Agadir"],
 ["fes","Fès"],["meknes","Meknès"],["kenitra","Kénitra"],["tetouan","Tétouan"],["oujda","Oujda"],
 ["el jadida","El Jadida"],["mohammedia","Mohammedia"],["temara","Témara"],["sale","Salé"],
 ["safi","Safi"],["nador","Nador"],["beni mellal","Béni Mellal"],["khouribga","Khouribga"],
 ["settat","Settat"],["essaouira","Essaouira"],["laayoune","Laâyoune"],["bouskoura","Bouskoura"],
 ["dar bouazza","Dar Bouazza"],["berrechid","Berrechid"],["larache","Larache"],["ouarzazate","Ouarzazate"]
]);
const regularCity=slug=>cityMap.get(canonical(slug))||null;

export function categoryFromUrl(raw,base=ROOTS[0]){
 try{
  const u=new URL(raw,base);
  if(u.protocol!=="https:"||!HOSTS.has(u.hostname.toLowerCase())||u.search||u.hash||u.pathname.includes(":"))return null;
  let path=decodeURIComponent(u.pathname).replace(/\/+$/,"");
  if(!/^\/fr\/(?:st|ct)\/[^/]+\/[^/]+$/i.test(path))return null;
  const parts=path.split("/");
  const kind=parts[2].toLowerCase(),city=regularCity(parts[3]);
  if(!TYPES.has(kind)||!city)return null;
  if(!/(?:-a-vendre|-a-louer|immobilier-a-vendre|immobilier-a-louer)$/i.test(parts[4]))return null;
  u.pathname=path;u.hash="";u.search="";
  return {url:u.href,city,kind,city_slug:parts[3],category:parts[4]};
 }catch{return null;}
}

export function extractFrontierCategories(html,pageUrl,{maxLinks=200}={}){
 const $=load(html);
 const out=new Map();
 for(const a of $("a[href]").toArray()){
  const parsed=categoryFromUrl($(a).attr("href"),pageUrl);
  if(!parsed)continue;
  const key=new URL(parsed.url).pathname.toLowerCase();
  if(!out.has(key))out.set(key,parsed);
  if(out.size>=maxLinks)break;
 }
 return [...out.values()].sort((a,b)=>a.url.localeCompare(b.url));
}

function isSamePage(requested,final){
 try{
  const a=new URL(requested),b=new URL(final);
  return HOSTS.has(a.hostname)&&HOSTS.has(b.hostname)
   &&a.pathname.replace(/\/+$/,"")===b.pathname.replace(/\/+$/,"")
   &&a.search===""&&b.search===""&&b.protocol==="https:";
 }catch{return false;}
}
export const seedPages=()=>[
 ...ROOTS.map(url=>({url,city:null,kind:"cc",seed:true})),
 ...categoryPlan().map(row=>({...row,kind:"st",seed:true}))
];
export function estimateCoverageGap(html,observed){
 const content=load(html)("body").text();
 const m=content.match(/\(([0-9][0-9\s\u00a0\u202f.,]*)\s+r[ée]sultats?\)/iu);
 const total=m?Number(m[1].replace(/[^0-9]/g,"")):null;
 return {site_result_count:Number.isSafeInteger(total)?total:null,
  underenumerated:total!==null&&Number.isSafeInteger(total)&&observed<total};
}
const tempRow=row=>({...row});
export async function runNationalFrontier({
 pages=seedPages(),maxRequests=100,fetchImpl=globalThis.fetch,paceMs=1750,
 sleep=ms=>new Promise(r=>setTimeout(r,ms)),robotsText=null,
 parser=extractMubawabResultCards,baselineIds=new Set(),maxHtmlBytes=3000000
}={}){
 const started_at=new Date().toISOString();
 const cap=Math.max(1,Math.min(120,Math.floor(maxRequests))), queue=[],seen=new Set(),queued=new Set();
 const enqueue=(item,front=false)=>{
  if(!item?.url)return false;
  const url=item.url;
  if(queued.has(url)||seen.has(url))return false;
  queued.add(url);front?queue.unshift(item):queue.push(item);return true;
 };
 for(const p of pages)enqueue(p);
 let robots=robotsText,halted=null,attempts=0,ok=0,discovered=0,skippedRobots=0,failures=0;
 const observations=[],reports=[];
 if(robots===null)try{
  const r=await fetchImpl("https://www.mubawab.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error("robots_failed");
  robots=await r.text();if(!robots||robots.length>100000)throw Error("robots_invalid");
 }catch{halted="robots_unavailable_fail_closed";}
 while(queue.length&&attempts<cap&&!halted){
  const next=queue.shift();
  if(!next||seen.has(next.url))continue;
  seen.add(next.url);
  const root=new URL(next.url);
  if(!HOSTS.has(root.hostname)||root.protocol!=="https:"||root.search||root.hash||root.pathname.includes(":")||!robotsAllowed(robots,next.url,UA)){
   skippedRobots++;reports.push({url:next.url,state:"disallowed_or_untrusted"});continue;
  }
  if(attempts&&paceMs)await sleep(paceMs);
  attempts++;
  let response;
  try{response=await fetchImpl(next.url,{headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},redirect:"follow",signal:AbortSignal.timeout(20000)});}
  catch{if(++failures>=3)halted="three_network_failures";reports.push({url:next.url,state:"network_error"});continue;}
  if(response.status===403||response.status===429){
   halted="http_"+response.status;reports.push({url:next.url,state:halted});break;
  }
  if(response.status!==200||!isSamePage(next.url,response.url)){
   reports.push({url:next.url,state:response.status!==200?"http_"+response.status:"redirected_out_of_category"});continue;
  }
  if(!/html/i.test(response.headers?.get?.("content-type")||"")){
   reports.push({url:next.url,state:"non_html"});continue;
  }
  let html;
  try{html=await response.text();}catch{reports.push({url:next.url,state:"body_read_error"});continue;}
  if(Buffer.byteLength(html,"utf8")>maxHtmlBytes){
   reports.push({url:next.url,state:"oversized_html"});continue;
  }
  ok++;failures=0;
  const children=extractFrontierCategories(html,response.url);
  let newlyQueued=0;
  for(const child of children){
   if(enqueue(child,true)){discovered++;newlyQueued++;}
  }
  // Root national pages discover site-authored city categories.
  // They are NOT assigned a city and cannot contribute fictitious city fields.
  if(!next.city){
   reports.push({url:next.url,state:"discovery_only",discovered_categories:newlyQueued});
   continue;
  }
  const parsed=parser(html,response.url,next.city);
  observations.push({seed:next,rows:parsed.rows});
  const gap=estimateCoverageGap(html,parsed.rows.length);
  reports.push({url:next.url,city:next.city,kind:next.kind,state:"observed",cards:parsed.rows.length,
   five_fields:parsed.five_field_present,discovered_categories:newlyQueued,...gap});
 }
 const merged=accumulateCards(observations);
 for(const row of merged.rows){
  row.freshness_certified=false;row.active_detail_verified=false;row.cross_source_deduplicated=false;
 }
 const netNew=merged.rows.filter(r=>!baselineIds.has(r.identity)).length;
 const netComplete=merged.rows.filter(r=>r.five_field_observed&&!baselineIds.has(r.identity)).length;
 const result={schema_version:"AKARFINDER_MUBAWAB_NATIONAL_FRONTIER_V1",
  semantics:"result_cards_only_no_freshness_certified",
  started_at,completed_at:new Date().toISOString(),max_requests:cap,requests:attempts,observed_pages:ok,
  cards_seen:merged.observations,unique_listing_ids:merged.unique,five_field_observed:merged.complete,
  net_new_ids_vs_prior_50:netNew,net_new_five_field_vs_prior_50:netComplete,
  cross_page_conflicts:merged.conflict_rows,duplicate_observations:merged.duplicates,
  discovered_category_urls:discovered,unvisited_queued_categories:queue.length,
  skipped_robots_or_untrusted:skippedRobots,halted_reason:halted,
  pages:reports,database_access:0,database_writes:0,
  note:"No active-sale/freshness/cross-source uniqueness certified; no individual detail requests, bypasses, login, proxies or private APIs."
 };
 return {report:result,rows:merged.rows};
}
async function main(){
 const baseline=process.env.CARDS_BASELINE_JSONL;
 const baselineIds=new Set();
 if(baseline){
  const text=await fs.readFile(baseline,"utf8");
  for(const line of text.split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);if(/^a:\d+$/.test(row.identity||""))baselineIds.add(row.identity);
  }
 }
 const maxRequests=Number(process.env.FRONTIER_MAX_REQUESTS||100);
 const {report,rows}=await runNationalFrontier({maxRequests,baselineIds});
 const out=process.env.OUTPUT_PREFIX||"mubawab-frontier-100";
 await fs.writeFile(out+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(out+".jsonl",rows.map(r=>JSON.stringify(r)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify({...report,pages:undefined},null,2));
 if(report.halted_reason||report.observed_pages<3)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error(e instanceof Error?e.message:"frontier_failed");process.exitCode=1;});
}
