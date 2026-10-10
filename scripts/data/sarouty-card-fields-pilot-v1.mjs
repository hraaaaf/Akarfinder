import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";
import {saroutyCrawlDelay} from "./sarouty-card-canary-v1.mjs";
import {extractSaroutyResultCards} from "./sarouty-result-cards-v1.mjs";

const UA="AkarFinderSaroutyCardPilot/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["sarouty.ma","www.sarouty.ma"]);
export const SEEDS=[
 {city:"Casablanca",url:"https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/"},
 {city:"Rabat",url:"https://www.sarouty.ma/acheter/rabat/appartements-a-vendre/"},
 {city:"Marrakech",url:"https://www.sarouty.ma/acheter/marrakech/appartements-a-vendre/"},
 {city:"Tanger",url:"https://www.sarouty.ma/acheter/tanger/appartements-a-vendre/"},
 {city:"Agadir",url:"https://www.sarouty.ma/acheter/agadir/appartements-a-vendre/"},
 {city:"Kenitra",url:"https://www.sarouty.ma/acheter/kenitra/appartements-a-vendre/"}
];
const sameRoute=(a,b)=>{
 try{const x=new URL(a),y=new URL(b);
  return HOSTS.has(x.hostname)&&HOSTS.has(y.hostname)&&x.pathname.replace(/\/+$/,"")===y.pathname.replace(/\/+$/,"")
  &&x.protocol==="https:"&&y.protocol==="https:"&&!y.search&&!y.hash;
 }catch{return false;}
};
export async function runSaroutyCardFieldPilot({fetchImpl=globalThis.fetch,robotsText=null,seeds=SEEDS,
 sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),parser=extractSaroutyResultCards}={}){
 let robots=robotsText,halted=null,requests=0;
 if(robots===null)try{
  const response=await fetchImpl("https://www.sarouty.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(response.status!==200)throw Error("robots_not_available");
  robots=await response.text();if(!robots||robots.length>120000)throw Error("robots_invalid");
 }catch{halted="robots_unavailable_fail_closed";}
 const delay=robots?saroutyCrawlDelay(robots,UA):null;
 if(delay===null)halted="robots_crawl_delay_invalid";
 const entries=[],byIdentity=new Map();
 for(const seed of seeds.slice(0,6)){
  if(halted)break;
  if(!robotsAllowed(robots,seed.url,UA)){entries.push({city:seed.city,state:"robots_disallowed"});continue;}
  if(requests)await sleep(Math.max(10000,Math.ceil(delay*1000)));
  requests++;
  let response;
  try{response=await fetchImpl(seed.url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(20000)});}
  catch{entries.push({city:seed.city,state:"network_error"});continue;}
  if(response.status===403||response.status===429){halted="http_"+response.status;entries.push({city:seed.city,state:halted});break;}
  if(response.status!==200){entries.push({city:seed.city,state:"http_"+response.status});continue;}
  if(!sameRoute(seed.url,response.url)){entries.push({city:seed.city,state:"redirect_or_untrusted_host"});continue;}
  if(!/html/i.test(response.headers?.get?.("content-type")||"")){entries.push({city:seed.city,state:"non_html"});continue;}
  try{
   const html=await response.text();if(Buffer.byteLength(html,"utf8")>3000000){entries.push({city:seed.city,state:"oversized"});continue;}
   const result=parser(html,response.url,seed.city);
   entries.push({city:seed.city,state:"observed",link_candidates:result.link_candidates,isolated_ids:result.isolated_ids,
    five_fields:result.five_field_observed,price_present:result.price_present,
    surface_present:result.surface_present,district_present:result.district_present});
   for(const row of result.rows){
    const existing=byIdentity.get(row.identity);
    if(!existing){byIdentity.set(row.identity,{...row,conflicting_cross_page_fields:[]});continue;}
    // Reject rather than choose among conflicting observations of the same source ID.
    for(const f of ["city","district","price_mad","surface_m2"]){
     if(existing[f]!==null&&row[f]!==null&&existing[f]!==row[f]){
      existing[f]=null;if(!existing.conflicting_cross_page_fields.includes(f))existing.conflicting_cross_page_fields.push(f);
     }
    }
    existing.five_field_observed=existing.five_field_observed&&row.five_field_observed&&existing.conflicting_cross_page_fields.length===0;
   }
  }catch{entries.push({city:seed.city,state:"parse_error"});}
 }
 const rows=[...byIdentity.values()].sort((a,b)=>a.identity.localeCompare(b.identity));
 const five=rows.filter(x=>x.five_field_observed&&x.conflicting_cross_page_fields.length===0).length;
 return {report:{schema_version:"AKARFINDER_SAROUTY_CARD_FIELDS_PILOT_V1",
  semantics:"same_card_source_identity_and_fields_observed_not_freshness_or_sale_certification",
  target_categories:Math.min(6,seeds.length),category_requests:requests,
  robots_checked:!!robots,crawl_delay_seconds:delay,minimum_pause_ms:Math.max(10000,Math.ceil((delay||0)*1000)),
  stopped_early:halted,observed_pages:entries.filter(x=>x.state==="observed").length,
  source_ids_observed:rows.length,five_field_observed:five,
  conflict_rows:rows.filter(x=>x.conflicting_cross_page_fields.length).length,
  pages:entries,database_access:0,database_writes:0,
  note:"No detail fetch; source ID and five card fields are observations only. No freshness, commercial availability, physical uniqueness or republication rights certified."
 },rows};
}
async function main(){
 const {report,rows}=await runSaroutyCardFieldPilot();
 const out=process.env.OUTPUT_PREFIX||"sarouty-card-fields-pilot";
 await fs.writeFile(out+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(out+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify(report,null,2));
 if(report.stopped_early||report.observed_pages===0)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e?.message||"pilot_error");process.exitCode=1;});
