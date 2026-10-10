import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { extractMubawabResultCards, robotsAllowed } from "./mubawab-result-cards-v1.mjs";
import { parseMubawabRoute } from "./mubawab-url-parser-v2.mjs";

const UA="AkarFinderCardAcquisitionV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["mubawab.ma","www.mubawab.ma"]);
const CITIES=[
 ["casablanca","Casablanca"],["rabat","Rabat"],["marrakech","Marrakech"],
 ["tanger","Tanger"],["agadir","Agadir"]
];
const TYPES=["appartements","maisons","villas-et-maisons-de-luxe","terrains","bureaux-et-commerces"];
const TRANSACTIONS=["a-vendre","a-louer"];
const SAFE_PREFIX="/fr/st/";
const FIELDS=["city","district","price_mad","surface_m2"];

export function categoryPlan({maxPages=50}={}){
 const pages=[];
 for(const type of TYPES)for(const transaction of TRANSACTIONS)for(const [slug,city] of CITIES){
  const path="/fr/st/"+slug+"/"+type+"-"+transaction;
  pages.push({url:"https://www.mubawab.ma"+path,city,city_slug:slug,type,transaction});
 }
 return pages.slice(0,Math.max(1,Math.min(50,Math.floor(maxPages))));
}

export function isSameCategoryRoute(requested,finalUrl){
 try{
  const a=new URL(requested),b=new URL(finalUrl);
  return HOSTS.has(a.hostname)&&HOSTS.has(b.hostname)&&a.protocol==="https:"&&b.protocol==="https:"
   &&a.pathname.replace(/\/+$/,"")===b.pathname.replace(/\/+$/,"")
   &&a.pathname.startsWith(SAFE_PREFIX)&&!b.search;
 }catch{return false;}
}

function publicRow(row,seed){
 return {
  identity:row.identity,canonical_url:row.canonical_url,city:row.district?row.city:null,
  district:row.district||null,price_mad:row.price_mad??null,surface_m2:row.surface_m2??null,
  first_category:seed.url,observation_count:1,
  cross_page_conflicts:[],
  // A listing location must occur in an explicit "district, city" card label.
  city_provenance:row.district?"card_location_corresponds_to_category_city":"missing_explicit_card_location",
  state:"observed_review_not_freshness_certified",
  freshness_certified:false,active_detail_verified:false,cross_source_deduplicated:false
 };
}

export function accumulateCards(entries){
 const byId=new Map();
 let observations=0,duplicates=0;
 for(const item of entries){
  const seed=item.seed||{url:"unknown"};
  for(const row of item.rows||[]){
   if(typeof row.identity!=="string"||!/^a:\d+$/.test(row.identity))continue;
   observations++;
   if(!byId.has(row.identity)){byId.set(row.identity,publicRow(row,seed));continue;}
   duplicates++;
   const previous=byId.get(row.identity);
   previous.observation_count++;
   const fresh=publicRow(row,seed);
   for(const f of FIELDS){
    // A missing value on a later card is not a conflict; it is an absence of evidence.
    if(fresh[f]===null)continue;
    if(previous[f]===null){
     if(!previous.cross_page_conflicts.includes(f))previous[f]=fresh[f];
     continue;
    }
    const equal=f==="city"||f==="district"
      ?String(previous[f]).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()===String(fresh[f]).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
      :previous[f]===fresh[f];
    if(!equal){previous[f]=null;if(!previous.cross_page_conflicts.includes(f))previous.cross_page_conflicts.push(f);}
   }
  }
 }
 const rows=[...byId.values()].sort((a,b)=>a.identity.localeCompare(b.identity));
 for(const row of rows){
  row.five_field_observed=FIELDS.every(f=>row[f]!==null)&&row.cross_page_conflicts.length===0;
 }
 return {rows,observations,duplicates,unique:rows.length,
  complete:rows.filter(r=>r.five_field_observed).length,
  conflict_rows:rows.filter(r=>r.cross_page_conflicts.length).length};
}

function classifyError(e){return e?.name==="TimeoutError"||e?.name==="AbortError"?"timeout":"network_error";}

export async function acquireResultCards({
 pages=categoryPlan(),fetchImpl=globalThis.fetch,parser=extractMubawabResultCards,
 paceMs=1750,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
 maxHtmlBytes=3000000,
 robotsText=null,
 existingIds=null
}={}){
 if(typeof fetchImpl!=="function")throw new TypeError("fetchImpl required");
 const selected=pages.slice(0,50),reports=[],observations=[];
 const begun=new Date().toISOString();
 let robots=robotsText,haltedReason=null,attempts=0,scanned=0;
 if(robots===null){
  try{
   const response=await fetchImpl("https://www.mubawab.ma/robots.txt",
    {headers:{"user-agent":UA},signal:AbortSignal.timeout(15000)});
   if(response.status!==200)throw Error("robot_unavailable");
   robots=await response.text();
   if(!robots||robots.length>100000)throw Error("robot_invalid");
  }catch{haltedReason="robots_unavailable_fail_closed";}
 }
 let consecutiveFailures=0;
 for(const seed of selected){
  if(haltedReason)break;
  if(!isSameCategoryRoute(seed.url,seed.url)||!robotsAllowed(robots,seed.url,UA)){
   reports.push({url:seed.url,city:seed.city,type:seed.type,transaction:seed.transaction,state:"robots_or_scope_disallowed"});
   continue;
  }
  if(attempts>0&&paceMs>0)await sleep(paceMs);
  attempts++;
  let response;
  try{
   response=await fetchImpl(seed.url,{redirect:"follow",headers:{"user-agent":UA,"accept":"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(20000)});
  }catch(e){
   reports.push({url:seed.url,city:seed.city,type:seed.type,transaction:seed.transaction,state:classifyError(e)});
   if(++consecutiveFailures>=3)haltedReason="three_consecutive_fetch_errors";
   continue;
  }
  const base={url:seed.url,city:seed.city,type:seed.type,transaction:seed.transaction,http_status:response.status};
  if(response.status===403||response.status===429){
   haltedReason="http_"+response.status;
   reports.push({...base,state:haltedReason});break;
  }
  if(response.status!==200){
   reports.push({...base,state:"http_non_200"});consecutiveFailures++;continue;
  }
  if(!isSameCategoryRoute(seed.url,response.url)){
   reports.push({...base,state:"redirected_out_of_category"});consecutiveFailures++;continue;
  }
  const ct=response.headers?.get?.("content-type")||"";
  const announced=Number(response.headers?.get?.("content-length"));
  if(!/html/i.test(ct)||Number.isFinite(announced)&&announced>maxHtmlBytes){
   reports.push({...base,state:"unsupported_content"});consecutiveFailures++;continue;
  }
  let html;
  try{html=await response.text();}catch(e){
   reports.push({...base,state:classifyError(e)});consecutiveFailures++;continue;
  }
  if(Buffer.byteLength(html,"utf8")>maxHtmlBytes){
   reports.push({...base,state:"oversized_html"});consecutiveFailures++;continue;
  }
  const parsed=parser(html,response.url,seed.city);
  scanned++;consecutiveFailures=0;
  reports.push({...base,state:"observed",cards:parsed.rows.length,card_5of5:parsed.five_field_present,
   ambiguous_card_ancestors:parsed.rejected_mixed,detail_links:parsed.raw_detail_anchors});
  observations.push({seed,rows:parsed.rows});
 }
 const merged=accumulateCards(observations);
 const matches=new Map();
 for(const row of merged.rows){
  if(!row.five_field_observed)continue;
  const normalized=v=>String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const signature=[normalized(row.city),normalized(row.district),row.price_mad,row.surface_m2].join("|");
  if(!matches.has(signature))matches.set(signature,[]);
  matches.get(signature).push(row.identity);
 }
 const possibleMatches=[...matches.values()].filter(group=>group.length>1);
 const possibleMatchIds=new Set(possibleMatches.flat());
 for(const row of merged.rows)row.possible_cross_id_duplicate=possibleMatchIds.has(row.identity);
 const seen=existingIds instanceof Set?existingIds:null;
 const netNew=seen?merged.rows.filter(r=>!seen.has(r.identity)).length:null;
 const completeNew=seen?merged.rows.filter(r=>r.five_field_observed&&!seen.has(r.identity)).length:null;
 const report={
  schema_version:"AKARFINDER_CARD_ACQUISITION_V1",
  semantics:"card_observed_only_not_freshness_or_live_detail_certified",
  started_at:begun,completed_at:new Date().toISOString(),
  target_page_count:selected.length,request_count:attempts,observed_page_count:scanned,
  halted_reason:haltedReason,robots_checked:typeof robots==="string"&&robots.length>0,
  source:"mubawab.ma",
  observed_cards:merged.observations,unique_source_id_count:merged.unique,
  duplicate_observations:merged.duplicates,cross_category_conflict_rows:merged.conflict_rows,
  possible_same_property_signature_groups:possibleMatches.length,
  possible_cross_id_duplicate_rows:possibleMatchIds.size,
  unique_five_field_observed:merged.complete,
  five_field_pct:merged.unique?Number((merged.complete/merged.unique*100).toFixed(2)):0,
  net_new_source_ids_vs_freeze:netNew,net_new_five_field_vs_freeze:completeNew,
  pages:reports,
  database_access:0,database_writes:0,
  note:"Only one listing card per identity and explicit district-city location. No detail pages requested; observed cards not promotable until freshness, validity and cross-source dedup are verified."
 };
 return {report,rows:merged.rows};
}

export async function loadExistingMubawabIds(gzipPath){
 const ids=new Set();
 const input=createReadStream(gzipPath).pipe(createGunzip());
 for await(const line of readline.createInterface({input,crlfDelay:Infinity})){
  if(!line.trim())continue;
  const row=JSON.parse(line);
  if(!["mubawab.ma","www.mubawab.ma"].includes(row.source_domain))continue;
  const parsed=parseMubawabRoute(row.canonical_url||"");
  if(parsed?.kind==="a")ids.add(parsed.identity);
 }
 return ids;
}

async function main(){
 const existing=process.env.FREEZE_JSONL_GZ?await loadExistingMubawabIds(process.env.FREEZE_JSONL_GZ):null;
 const result=await acquireResultCards({existingIds:existing});
 const prefix=process.env.OUTPUT_PREFIX||"mubawab-mass-acquisition-50";
 await fs.writeFile(prefix+".json",JSON.stringify(result.report,null,2)+"\n");
 await fs.writeFile(prefix+".jsonl",result.rows.map(r=>JSON.stringify(r)).join("\n")+(result.rows.length?"\n":""));
 console.log(JSON.stringify({...result.report,pages:undefined},null,2));
 if(result.report.observed_page_count===0||result.report.halted_reason)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
