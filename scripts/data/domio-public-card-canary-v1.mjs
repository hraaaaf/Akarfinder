import fs from "node:fs/promises";
import {probeDomioCardHtml} from "./domio-result-card-probe-v1.mjs";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";

const UA="AkarFinderDomioCardPilot/1.0 (+https://akarfinder.ma)";
const urls=["https://domio.ma/fr/appartement/vendre/casablanca","https://domio.ma/fr/appartement/vendre/marrakech"];
const prefix=process.env.OUTPUT_PREFIX||"domio-card-canary";
const outcomes=[],cards=new Map();
let robots=null,halted=null,requests=0;
try{
 const r=await fetch("https://domio.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
 if(r.status!==200)throw Error("robots_not_200");
 robots=await r.text();if(!robots||robots.length>100000)throw Error("robots_invalid");
}catch{halted="robots_unavailable_fail_closed";}
for(const url of urls){
 if(halted)break;
 if(!robotsAllowed(robots,url,UA)){outcomes.push({url,state:"robots_disallowed"});continue;}
 if(requests>0)await new Promise(resolve=>setTimeout(resolve,1750));
 requests++;
 try{
  const r=await fetch(url,{headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(18000)});
  if(r.status===403||r.status===429){halted="http_"+r.status;outcomes.push({url,state:halted});break;}
  if(r.status!==200){outcomes.push({url,state:"http_"+r.status});continue;}
  if(new URL(r.url).pathname!==new URL(url).pathname||!["domio.ma","www.domio.ma"].includes(new URL(r.url).hostname)){
   outcomes.push({url,state:"redirected_out_of_category"});continue;
  }
  if(!/html/i.test(r.headers?.get?.("content-type")||"")){outcomes.push({url,state:"non_html"});continue;}
  const html=await r.text();
  if(Buffer.byteLength(html,"utf8")>3000000){outcomes.push({url,state:"oversized"});continue;}
  const info=probeDomioCardHtml(html,r.url);
  outcomes.push({url,state:"observed",unique_cards:info.unique_identity_count,price_present:info.price_present,surface_present:info.surface_present});
  for(const row of info.rows)if(!cards.has(row.identity))cards.set(row.identity,row);
 }catch{outcomes.push({url,state:"fetch_error"});}
}
const rows=[...cards.values()];
const report={
 schema_version:"AKARFINDER_DOMIO_CARD_CANARY_V1",semantics:"unverified_public_dom_card_probe",
 robots_checked:!!robots,requested_pages:urls.length,category_requests:requests,observed_pages:outcomes.filter(x=>x.state==="observed").length,
 unique_detail_ids:rows.length,price_present:rows.filter(x=>x.price_mad!==null).length,surface_present:rows.filter(x=>x.surface_m2!==null).length,
 halted_reason:halted,pages:outcomes,database_access:0,database_writes:0,
 note:"No detail requests; no district or freshness certified, fail closed on robots denial or 403/429."
};
await fs.writeFile(prefix+".json",JSON.stringify(report,null,2)+"\n");
await fs.writeFile(prefix+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":""));
console.log(JSON.stringify(report,null,2));
if(halted||report.observed_pages===0)process.exitCode=2;
