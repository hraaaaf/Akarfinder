import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {parseMubawabRoute} from "./mubawab-url-parser-v2.mjs";
import {hasMubawabPrimaryDetail,inspectMubawabStrictSurface} from "./mubawab-strict-surface-v2.js";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";

const UA="AkarFinderCardDetailAuditV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["www.mubawab.ma","mubawab.ma"]);
const MAX=30;
const stamp=id=>createHash("sha256").update(id).digest("hex");

export function sampleObservedCards(rows,max=MAX){
 const eligible=rows.filter(r=>r.five_field_observed===true&&r.possible_cross_id_duplicate!==true
    &&/^a:\d+$/.test(r.identity||"")&&r.canonical_url&&r.city&&r.district&&r.price_mad&&r.surface_m2);
 const groups=new Map();
 for(const row of eligible){
  if(!groups.has(row.city))groups.set(row.city,[]);
  groups.get(row.city).push(row);
 }
 const selected=[];
 const perCity=Math.max(1,Math.ceil(Math.min(MAX,max)/Math.max(1,groups.size)));
 for(const city of [...groups.keys()].sort()){
  const group=groups.get(city).sort((a,b)=>stamp(a.identity).localeCompare(stamp(b.identity)));
  selected.push(...group.slice(0,perCity));
 }
 return selected.sort((a,b)=>stamp(a.identity).localeCompare(stamp(b.identity))).slice(0,Math.min(MAX,max));
}

function hostAllowed(url){
 try {const u=new URL(url);return u.protocol==="https:"&&HOSTS.has(u.hostname.toLowerCase());}catch{return false;}
}

export function inspectMubawabDetail(html,sourceUrl,finalUrl,row,status=200){
 const requested=parseMubawabRoute(sourceUrl);
 const reached=hostAllowed(finalUrl)?parseMubawabRoute(finalUrl):null;
 const identityMatch=!!requested&&!!reached&&requested.identity===reached.identity&&requested.identity===row.identity;
 const primary=status===200&&identityMatch&&hasMubawabPrimaryDetail(html);
 const surfaceEvidence=primary?inspectMubawabStrictSurface(html):null;
 const surfaceValue=surfaceEvidence?.surface?.value??null;
 const surfaceMatch=surfaceValue===null?null:surfaceValue===row.surface_m2;
 return {
  identity:row.identity,http_status:status,
  identity_preserved:identityMatch,primary_detail_verified:primary,
  strict_surface_available:surfaceValue!==null,
  strict_surface_matches_card:surfaceMatch,
  conflicting_primary_surfaces:surfaceEvidence?.conflict===true,
  observation_state:primary?"primary_page_reachable":"unverified_or_redirected",
  active_listing_certified:false,freshness_certified:false,
  database_access:0,database_writes:0
 };
}

export async function runDetailCanary({
 rows,fetchImpl=globalThis.fetch,robotsText=null,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
 paceMs=1750,max=MAX
}){
 const sample=sampleObservedCards(rows,max),observations=[];
 let robots=robotsText,attempts=0,halted=null;
 if(robots===null){
  try{
   const r=await fetchImpl("https://www.mubawab.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
   if(r.status!==200)throw Error("robots unavailable");
   robots=await r.text();if(!robots)throw Error("empty robots");
  }catch{halted="robots_unavailable_fail_closed";}
 }
 for(const row of sample){
  if(halted)break;
  const url=row.canonical_url;
  if(!hostAllowed(url)||!robotsAllowed(robots,url,UA)){
   observations.push({identity:row.identity,observation_state:"robots_disallowed",freshness_certified:false});
   continue;
  }
  if(attempts>0&&paceMs>0)await sleep(paceMs);
  attempts++;
  let res;
  try{
   res=await fetchImpl(url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(18000)});
  }catch(e){
   observations.push({identity:row.identity,observation_state:e?.name==="AbortError"?"timeout":"network_error",freshness_certified:false});
   continue;
  }
  if(res.status===403||res.status===429){halted="http_"+res.status;observations.push({identity:row.identity,observation_state:halted,freshness_certified:false});break;}
  if(res.status!==200){
   observations.push(inspectMubawabDetail("",url,res.url,row,res.status));continue;
  }
  if(!/html/i.test(res.headers?.get?.("content-type")||"")){
   observations.push({identity:row.identity,observation_state:"non_html",freshness_certified:false});continue;
  }
  try{
   const html=await res.text();
   if(Buffer.byteLength(html,"utf8")>3000000){
    observations.push({identity:row.identity,observation_state:"oversized_html",freshness_certified:false});continue;
   }
   observations.push(inspectMubawabDetail(html,url,res.url,row,res.status));
  }catch{
   observations.push({identity:row.identity,observation_state:"read_or_parse_error",freshness_certified:false});
  }
 }
 const count=k=>observations.filter(x=>x[k]===true).length;
 return {report:{
  schema_version:"AKARFINDER_MUBAWAB_CARD_DETAIL_AUDIT_V1",
  semantics:"sampled_primary_identity_and_surface_evidence_only_not_freshness",
  sample_target:Math.min(MAX,max),sample_selected:sample.length,detail_requests:attempts,halted_reason:halted,
  identity_preserved:count("identity_preserved"),
  primary_detail_verified:count("primary_detail_verified"),
  strict_surface_available:count("strict_surface_available"),
  strict_surface_matches_card:count("strict_surface_matches_card"),
  surface_mismatches:observations.filter(x=>x.strict_surface_matches_card===false).length,
  database_access:0,database_writes:0,
  note:"A fetchable page with a stable listing ID is not proof of the original publication date, sale status or permission to republish."
 },observations};
}

async function main(){
 const input=process.env.CARDS_JSONL||".tmp/card-observations/mubawab-mass-acquisition-50.jsonl";
 const prefix=process.env.OUTPUT_PREFIX||"mubawab-card-detail-audit-30";
 const rows=(await fs.readFile(input,"utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
 const result=await runDetailCanary({rows});
 await fs.writeFile(prefix+".json",JSON.stringify(result.report,null,2)+"\n");
 await fs.writeFile(prefix+".jsonl",result.observations.map(x=>JSON.stringify(x)).join("\n")+(result.observations.length?"\n":""));
 console.log(JSON.stringify(result.report,null,2));
 if(result.report.sample_selected===0||result.report.halted_reason)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
