import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {load} from "cheerio";
import {probeDomioCardHtml} from "./domio-result-card-probe-v1.mjs";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";

const UA="AkarFinderDomioPaginationV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["domio.ma","www.domio.ma"]);
const SEED_URLS=[
 "https://domio.ma/fr/appartement/vendre/casablanca",
 "https://domio.ma/fr/appartement/vendre/marrakech",
 "https://domio.ma/fr/appartement/vendre/rabat",
 "https://domio.ma/fr/appartement/louer/casablanca",
 "https://domio.ma/fr/appartement/louer/rabat",
 "https://domio.ma/fr/appartement/vendre/tanger/300000",
 "https://domio.ma/fr/appartement/vendre/agadir/1000000"
];

export function domioPageNumber(raw,seed){
 try{
  const u=new URL(raw,seed),base=new URL(seed);
  if(u.protocol!=="https:"||!HOSTS.has(u.hostname.toLowerCase())||u.pathname!==base.pathname||u.hash)return null;
  const entries=[...u.searchParams.entries()];
  if(entries.length===0)return 1;
  if(entries.length!==1||entries[0][0]!=="page"||!/^\d{1,3}$/.test(entries[0][1]))return null;
  const p=Number(entries[0][1]);
  return Number.isSafeInteger(p)&&p>=1&&p<=200?p:null;
 }catch{return null;}
}
export function linkedNextPage(html,currentUrl,seedUrl){
 const current=domioPageNumber(currentUrl,seedUrl);
 if(!current)return null;
 const $=load(html);
 for(const el of $("a[href]").toArray()){
  const raw=$(el).attr("href");
  if(!raw)continue;
  const n=domioPageNumber(raw,seedUrl);
  if(n!==current+1)continue;
  const target=new URL(raw,currentUrl);
  if(target.protocol!=="https:"||!HOSTS.has(target.hostname.toLowerCase()))continue;
  return target.href;
 }
 return null;
}
const fingerprint=r=>[r.city,r.district,r.price_mad,r.surface_m2].map(x=>String(x??"")).join("|");
export function mergeDomioRows(observations){
 const m=new Map();
 let duplicated=0,conflicted=0;
 for(const {rows} of observations){
  for(const r of rows||[]){
   if(!/^domio:\d+$/.test(r.identity||""))continue;
   if(!m.has(r.identity)){
    m.set(r.identity,{...r,duplicate_observation_count:0,cross_page_conflict:false,
     freshness_certified:false,active_detail_verified:false,cross_source_deduplicated:false});
    continue;
   }
   duplicated++;
   const prev=m.get(r.identity);
   prev.duplicate_observation_count++;
   if(fingerprint(prev)!==fingerprint(r)){
    if(!prev.cross_page_conflict)conflicted++;
    prev.cross_page_conflict=true;prev.five_field_present=false;
   }
  }
 }
 const rows=[...m.values()].sort((a,b)=>a.identity.localeCompare(b.identity));
 return {rows,duplicated,conflicted,complete:rows.filter(x=>x.five_field_present&&!x.cross_page_conflict).length};
}

export async function crawlDomioLinkedPages({
 seeds=SEED_URLS,maxRequests=80,maxPerCategory=12,
 paceMs=1800,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
 fetchImpl=globalThis.fetch,parser=probeDomioCardHtml,robotsText=null,
 baselineIds=new Set(),maxHtmlBytes=3000000
}={}){
 const cap=Math.max(1,Math.min(100,Math.floor(maxRequests))),perRoute=Math.max(1,Math.min(20,Math.floor(maxPerCategory)));
 const queue=[],visited=new Set(),counts=new Map(),previousIds=new Map();
 const observations=[],reports=[];
 for(const seed of seeds){
  if(domioPageNumber(seed,seed)!==1)continue;
  queue.push({url:seed,seed,page:1});
  counts.set(seed,0);
 }
 let robots=robotsText,halted=null,attempts=0,ok=0,staleBranches=0,disallowed=0;
 if(robots===null)try{
  const r=await fetchImpl("https://domio.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error("robots");
  robots=await r.text();if(!robots||robots.length>100000)throw Error("robots-invalid");
 }catch{halted="robots_unavailable_fail_closed";}
 while(queue.length&&attempts<cap&&!halted){
  const item=queue.shift(),key=item.seed+"|"+item.page;
  if(visited.has(key))continue;
  visited.add(key);
  if(domioPageNumber(item.url,item.seed)!==item.page||!robotsAllowed(robots,item.url,UA)){
   disallowed++;reports.push({category:item.seed,page:item.page,state:"robots_or_route_disallowed"});continue;
  }
  if(attempts&&paceMs>0)await sleep(paceMs);
  attempts++;counts.set(item.seed,(counts.get(item.seed)||0)+1);
  let r;
  try{r=await fetchImpl(item.url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(18000)});}
  catch{reports.push({category:item.seed,page:item.page,state:"fetch_error"});continue;}
  if(r.status===403||r.status===429){halted="http_"+r.status;reports.push({category:item.seed,page:item.page,state:halted});break;}
  if(r.status!==200||domioPageNumber(r.url,item.seed)!==item.page){
   reports.push({category:item.seed,page:item.page,state:r.status===200?"redirected_off_page":"http_"+r.status});continue;
  }
  if(!/html/i.test(r.headers?.get?.("content-type")||"")){
   reports.push({category:item.seed,page:item.page,state:"non_html"});continue;
  }
  let html;
  try{html=await r.text();}catch{reports.push({category:item.seed,page:item.page,state:"body_error"});continue;}
  if(Buffer.byteLength(html,"utf8")>maxHtmlBytes){reports.push({category:item.seed,page:item.page,state:"oversized"});continue;}
  const result=parser(html,r.url);
  ok++;
  const currentIds=new Set(result.rows.map(x=>x.identity));
  const previous=previousIds.get(item.seed)||new Set();
  const newVsPrevious=[...currentIds].filter(x=>!previous.has(x)).length;
  const identical=currentIds.size>0&&newVsPrevious===0;
  const next=linkedNextPage(html,r.url,item.seed);
  observations.push({item,rows:result.rows});
  reports.push({category:item.seed,page:item.page,state:"observed",cards:result.rows.length,
   five_fields:result.five_field_present,new_vs_previous_page:newVsPrevious,
   next_link_present:!!next,identical_to_previous_page:identical});
  if(identical){staleBranches++;continue;}
  previousIds.set(item.seed,currentIds);
  if(next&&item.page<perRoute&&(counts.get(item.seed)||0)<perRoute&&!visited.has(item.seed+"|"+(item.page+1))){
   queue.push({url:next,seed:item.seed,page:item.page+1});
  }
 }
 const merged=mergeDomioRows(observations);
 const netNew=merged.rows.filter(x=>!baselineIds.has(x.identity)).length;
 const netComplete=merged.rows.filter(x=>x.five_field_present&&!x.cross_page_conflict&&!baselineIds.has(x.identity)).length;
 return {report:{
  schema_version:"AKARFINDER_DOMIO_LINKED_PAGINATION_V1",
  semantics:"source_linked_pagination_only_no_active_or_freshness_certification",
  source:"domio.ma",max_requests:cap,requests:attempts,observed_pages:ok,seed_categories:seeds.length,
  distinct_listing_ids:merged.rows.length,card_five_fields:merged.complete,
  net_new_ids_vs_page1_page2:netNew,net_new_five_fields_vs_page1_page2:netComplete,
  repeated_id_observations:merged.duplicated,cross_page_conflicts:merged.conflicted,
  identical_page_branches_stopped:staleBranches,robots_or_route_skipped:disallowed,
  queue_remaining:queue.length,halted_reason:halted,
  pages:reports,database_access:0,database_writes:0,
  note:"Page URLs must be explicitly linked by the previous HTML page, pass robots, and preserve category+page identity. No detail fetch or claims of fresh, active, unique properties."
 },rows:merged.rows};
}
async function main(){
 const baselineIds=new Set(),inputs=(process.env.BASELINE_DOMIO_JSONL||"").split(";").filter(Boolean);
 for(const file of inputs){
  const txt=await fs.readFile(file,"utf8");
  for(const line of txt.split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);if(/^domio:\d+$/.test(row.identity||""))baselineIds.add(row.identity);
  }
 }
 const result=await crawlDomioLinkedPages({baselineIds,maxRequests:Number(process.env.MAX_PAGES||80)});
 const out=process.env.OUTPUT_PREFIX||"domio-linked-pages-80";
 await fs.writeFile(out+".json",JSON.stringify(result.report,null,2)+"\n");
 await fs.writeFile(out+".jsonl",result.rows.map(x=>JSON.stringify(x)).join("\n")+(result.rows.length?"\n":""));
 console.log(JSON.stringify({...result.report,pages:undefined},null,2));
 if(result.report.halted_reason||result.report.observed_pages===0)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error(e instanceof Error?e.message:"domio_linked_crawl_error");process.exitCode=1;});
}
