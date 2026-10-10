import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {load} from "cheerio";
import {extractMubawabResultCards,robotsAllowed} from "./mubawab-result-cards-v1.mjs";
import {accumulateCards} from "./mubawab-card-scale-v1.mjs";

const UA="AkarFinderVerifiedDistrictShardV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["www.mubawab.ma","mubawab.ma"]);
const KNOWN=new Map([["casablanca","Casablanca"],["rabat","Rabat"],["marrakech","Marrakech"],["tanger","Tanger"],["agadir","Agadir"]]);
export const normalize=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
 .replace(/['’]/g," ").replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function slugifyDistrict(label){
 const words=normalize(label).replace(/\s+/g,"-");
 return words.length>=2&&words.length<=60&&/^[a-z0-9-]+$/.test(words)?words:null;
}
function intentFromCategory(raw){
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:"||!HOSTS.has(u.hostname.toLowerCase()))return null;
  const m=u.pathname.match(/^\/fr\/st\/([^/]+)\/[^/]*-(a-vendre|a-louer)$/i);
  if(!m||!KNOWN.has(decodeURIComponent(m[1]).toLowerCase()))return null;
  return {city_slug:m[1],city:KNOWN.get(decodeURIComponent(m[1]).toLowerCase()),intent:m[2]};
 }catch{return null;}
}
export function candidateDistricts(rows,max=120){
 const seen=new Map();
 for(const row of rows){
  const route=intentFromCategory(row.first_category||"");
  if(!route||normalize(row.city)!==normalize(route.city)||typeof row.district!=="string")continue;
  const slug=slugifyDistrict(row.district);
  if(!slug||slug===route.city_slug||row.district.length>65)continue;
  const key=[route.city_slug,slug,route.intent].join("|");
  if(!seen.has(key))seen.set(key,{city:route.city,city_slug:route.city_slug,district:row.district,
   district_slug:slug,intent:route.intent,observations:0});
  seen.get(key).observations++;
 }
 const byCity=new Map();
 for(const row of seen.values()){
  if(!byCity.has(row.city))byCity.set(row.city,[]);
  byCity.get(row.city).push(row);
 }
 for(const [,group]of byCity)group.sort((a,b)=>b.observations-a.observations||a.district_slug.localeCompare(b.district_slug));
 const cities=[...byCity.keys()].sort(),selected=[];
 while(selected.length<max){
  let progressed=false;
  for(const city of cities){
   const next=byCity.get(city).shift();
   if(next){selected.push({...next,url:"https://www.mubawab.ma/fr/cd/"+next.city_slug+"/"+next.district_slug+"/immobilier-"+next.intent});progressed=true;}
   if(selected.length>=max)break;
  }
  if(!progressed)break;
 }
 return {candidate_count:seen.size,selected};
}
export function certifyDistrictShard(html,url,candidate){
 const u=new URL(url),expected=new URL(candidate.url);
 if(!HOSTS.has(u.hostname)||u.protocol!=="https:"||u.pathname.replace(/\/+$/,"")!==expected.pathname)return {valid:false,reason:"redirected_or_untrusted"};
 const $=load(html);
 const heading=normalize($("h1").first().text());
 if(!heading||!heading.includes(normalize(candidate.city))||!heading.includes(normalize(candidate.district)))
  return {valid:false,reason:"heading_does_not_confirm_district_city"};
 if(!/immobilier|appartement|villa|maison/i.test(heading))return {valid:false,reason:"no_real_estate_heading"};
 return {valid:true,reason:"source_heading_confirms_city_district"};
}
export async function crawlVerifiedDistrictShards({
 baselineRows,maxRequests=120,paceMs=2100,fetchImpl=globalThis.fetch,
 sleep=ms=>new Promise(r=>setTimeout(r,ms)),robotsText=null,
 parser=extractMubawabResultCards,maxHtmlBytes=3000000
}={}){
 const limit=Math.max(1,Math.min(160,Math.floor(maxRequests)));
 const {candidate_count,selected}=candidateDistricts(baselineRows,limit);
 const oldIds=new Set(baselineRows.map(r=>r.identity));
 const reports=[],obs=[];
 let robots=robotsText,halted=null,requests=0,verifiedPages=0,notFound=0,rejectedHeadings=0;
 if(robots===null)try{
  const r=await fetchImpl("https://www.mubawab.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error("robots_not_200");
  robots=await r.text();if(!robots)throw Error("robots_empty");
 }catch{halted="robots_unavailable_fail_closed";}
 for(const item of selected){
  if(halted)break;
  if(item.url.includes(":p:")||!robotsAllowed(robots,item.url,UA)){
   reports.push({city:item.city,district:item.district,state:"robots_disallowed"});continue;
  }
  if(requests&&paceMs)await sleep(paceMs);
  requests++;
  let r;
  try{r=await fetchImpl(item.url,{headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},redirect:"follow",signal:AbortSignal.timeout(19000)});}
  catch{reports.push({city:item.city,district:item.district,state:"fetch_error"});continue;}
  if(r.status===403||r.status===429){halted="http_"+r.status;reports.push({city:item.city,district:item.district,state:halted});break;}
  if(r.status!==200){if(r.status===404)notFound++;reports.push({city:item.city,district:item.district,state:"http_"+r.status});continue;}
  if(!/html/i.test(r.headers?.get?.("content-type")||"")){reports.push({city:item.city,district:item.district,state:"non_html"});continue;}
  let html;
  try{html=await r.text();}catch{reports.push({city:item.city,district:item.district,state:"body_error"});continue;}
  if(Buffer.byteLength(html,"utf8")>maxHtmlBytes){reports.push({city:item.city,district:item.district,state:"oversized"});continue;}
  const gate=certifyDistrictShard(html,r.url,item);
  if(!gate.valid){rejectedHeadings++;reports.push({city:item.city,district:item.district,state:gate.reason});continue;}
  const parsed=parser(html,r.url,item.city);
  const scoped=parsed.rows.filter(row=>normalize(row.city)===normalize(item.city)&&normalize(row.district)===normalize(item.district));
  verifiedPages++;
  obs.push({seed:item,rows:scoped});
  reports.push({city:item.city,district:item.district,state:"verified_district_category",
   site_identity_confirmed:true,source_card_count:parsed.rows.length,matched_district_cards:scoped.length,
   cards_with_five_fields:scoped.filter(x=>x.five_field_present).length});
 }
 const merged=accumulateCards(obs);
 const netNew=merged.rows.filter(x=>!oldIds.has(x.identity)).length;
 const netNewComplete=merged.rows.filter(x=>!oldIds.has(x.identity)&&x.five_field_observed).length;
 return {report:{
  schema_version:"AKARFINDER_VERIFIED_DISTRICT_SHARDS_V1",semantics:"explicit_source_card_and_city_district_gate_not_freshness",
  candidate_count,selected_candidates:selected.length,request_count:requests,max_requests:limit,
  verified_district_pages:verifiedPages,http_404_routes:notFound,heading_rejected:rejectedHeadings,
  unique_source_ids:merged.unique,card_five_field:merged.complete,
  net_new_ids_vs_50:netNew,net_new_five_field_vs_50:netNewComplete,
  cross_card_conflicts:merged.conflict_rows,halted_reason:halted,database_access:0,database_writes:0,
  pages:reports,
  note:"Candidate URL is derived from an observed card; it only becomes trusted if the source returns exact route, explicit city and district in heading, and the same city+district in the listing card. No detail, freshness, availability or physical dedup asserted."
 },rows:merged.rows};
}
async function main(){
 const input=process.env.CARDS_BASELINE_JSONL||".tmp/mubawab-50/mubawab-mass-acquisition-50.jsonl";
 const rows=(await fs.readFile(input,"utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
 const result=await crawlVerifiedDistrictShards({baselineRows:rows,maxRequests:Number(process.env.DISTRICT_MAX_REQUESTS||120)});
 const p=process.env.OUTPUT_PREFIX||"mubawab-district-shards-120";
 await fs.writeFile(p+".json",JSON.stringify(result.report,null,2)+"\n");
 await fs.writeFile(p+".jsonl",result.rows.map(x=>JSON.stringify(x)).join("\n")+(result.rows.length?"\n":""));
 console.log(JSON.stringify({...result.report,pages:undefined},null,2));
 if(result.report.halted_reason||result.report.verified_district_pages===0)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error(e instanceof Error?e.message:"district_shard_failed");process.exitCode=1;});
}
