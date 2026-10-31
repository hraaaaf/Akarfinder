import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {probeDomioCardHtml} from "./domio-result-card-probe-v1.mjs";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";
const UA="AkarFinderDomioPaginationPilotV1/1.0 (+https://akarfinder.ma)";
export const BASES=[
 "https://domio.ma/fr/appartement/vendre/casablanca",
 "https://domio.ma/fr/appartement/vendre/marrakech",
 "https://domio.ma/fr/appartement/vendre/rabat",
 "https://domio.ma/fr/appartement/louer/casablanca",
 "https://domio.ma/fr/appartement/louer/rabat",
 "https://domio.ma/fr/appartement/vendre/tanger/300000",
 "https://domio.ma/fr/appartement/vendre/agadir/1000000"
];
export function pageTwoUrl(base){
 const u=new URL(base);
 if(u.protocol!=="https:"||!["domio.ma","www.domio.ma"].includes(u.hostname))return null;
 if(!u.pathname.startsWith("/fr/")||u.search)return null;
 u.searchParams.set("page","2");return u.href;
}
export function samePageTwo(requested,finalUrl){
 try{
  const a=new URL(requested),b=new URL(finalUrl);
  return a.protocol==="https:"&&b.protocol==="https:"
   &&["domio.ma","www.domio.ma"].includes(b.hostname)
   &&a.pathname===b.pathname&&b.searchParams.size===1&&b.searchParams.get("page")==="2";
 }catch{return false;}
}
export async function scanPageTwo({bases=BASES,fetchImpl=globalThis.fetch,robotsText=null,existingIds=new Set(),
 paceMs=1800,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const candidates=bases.slice(0,7).map(pageTwoUrl).filter(Boolean),out=[],rows=new Map();
 let robots=robotsText,halted=null,requests=0,rawCards=0;
 if(robots===null)try{
  const r=await fetchImpl("https://domio.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error("robots unavailable");
  robots=await r.text();if(!robots)throw Error("empty robots");
 }catch{halted="robots_unavailable_fail_closed";}
 for(const url of candidates){
  if(halted)break;
  if(!robotsAllowed(robots,url,UA)){out.push({url,state:"robots_disallowed"});continue;}
  if(requests&&paceMs)await sleep(paceMs);
  requests++;
  let r;try{r=await fetchImpl(url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(20000)});}
  catch{out.push({url,state:"fetch_error"});continue;}
  if(r.status===403||r.status===429){halted="http_"+r.status;out.push({url,state:halted});break;}
  if(r.status!==200){out.push({url,state:"http_"+r.status});continue;}
  if(!samePageTwo(url,r.url)){out.push({url,state:"redirect_or_page_identity_mismatch"});continue;}
  if(!/html/i.test(r.headers?.get?.("content-type")||"")){out.push({url,state:"not_html"});continue;}
  let html;try{html=await r.text();}catch{out.push({url,state:"read_failure"});continue;}
  if(Buffer.byteLength(html,"utf8")>3000000){out.push({url,state:"oversized"});continue;}
  const baseUrl=new URL(url);
  const city=baseUrl.pathname.split("/")[4]||"";
  const res=probeDomioCardHtml(html,url);
  rawCards+=res.rows.length;
  out.push({url,state:"observed",cards:res.rows.length,card_five_fields:res.five_field_present});
  for(const row of res.rows){
   if(!rows.has(row.identity))rows.set(row.identity,{...row,state:"observed_review_not_current_or_fresh_certified"});
  }
 }
 const list=[...rows.values()].sort((a,b)=>a.identity.localeCompare(b.identity));
 const complete=list.filter(x=>x.five_field_present).length;
 const incremental=list.filter(x=>!existingIds.has(x.identity));
 const report={
  schema_version:"AKARFINDER_DOMIO_PAGINATION_PAGE2_V1",
  semantics:"public_page_2_cards_not_freshness_certified",
  requested_pages:candidates.length,request_count:requests,observed_pages:out.filter(x=>x.state==="observed").length,
  observed_card_count:rawCards,unique_ids_page2:list.length,complete_cards_page2:complete,
  incremental_ids_vs_page1:incremental.length,
  incremental_five_field_vs_page1:incremental.filter(x=>x.five_field_present).length,
  overlap_ids_with_page1:list.length-incremental.length,
  halted_reason:halted,pages:out,database_access:0,database_writes:0,
  note:"Page-2 URLs are probed only where allowed by robots and the final URL must preserve exact page=2; no detail pages visited."
 };
 return {report,rows:list};
}
async function main(){
 const from=process.env.PAGE1_JSONL||".tmp/domio-page1/domio-card-canary.jsonl";
 const baseline=(await fs.readFile(from,"utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
 const existing=new Set(baseline.map(x=>x.identity));
 const {report,rows}=await scanPageTwo({existingIds:existing});
 const prefix=process.env.OUTPUT_PREFIX||"domio-page2-canary";
 await fs.writeFile(prefix+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(prefix+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify(report,null,2));
 if(report.halted_reason||report.observed_pages===0)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
