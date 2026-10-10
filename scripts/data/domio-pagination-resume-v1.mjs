import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {linkedNextPage,domioPageNumber,mergeDomioRows} from "./domio-linked-pagination-v1.mjs";
import {probeDomioCardHtml} from "./domio-result-card-probe-v1.mjs";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";

const UA="AkarFinderDomioResumeV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["domio.ma","www.domio.ma"]);

export function eligibleResumeSeeds(report,maxSeeds=7){
 const last=new Map();
 for(const p of report.pages||[]){
  if(p.state==="observed"&&Number.isInteger(p.page))last.set(p.category,p);
 }
 const out=[];
 for(const [category,p] of last){
  if(!p.next_link_present||p.page<2||domioPageNumber(category,category)!==1)continue;
  out.push({category,page:p.page,url:category+"?page="+p.page});
 }
 return out.sort((a,b)=>a.category.localeCompare(b.category)).slice(0,maxSeeds);
}

export async function resumeDomioPagination({
 referenceReport,referenceRows,fetchImpl=globalThis.fetch,parser=probeDomioCardHtml,
 robotsText=null,maxRequests=64,maxAdditionalPerCategory=12,paceMs=1800,
 sleep=ms=>new Promise(r=>setTimeout(r,ms))
}={}){
 const origins=eligibleResumeSeeds(referenceReport);
 const max=Math.max(1,Math.min(80,Math.floor(maxRequests)));
 const maxPer=Math.max(1,Math.min(16,Math.floor(maxAdditionalPerCategory)));
 const originalIds=new Set((referenceRows||[]).map(x=>x.identity));
 const observations=[],reports=[];
 const queues=origins.map(x=>({...x,added:0,prevIds:null})),requestsByCat=new Map();
 let attempts=0,ok=0,halted=null,duplicateBranches=0,invalid=0;
 let robots=robotsText;
 if(robots===null)try{
  const res=await fetchImpl("https://domio.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(res.status!==200)throw Error("robots HTTP");
  robots=await res.text();if(!robots)throw Error("robots empty");
 }catch{halted="robots_unavailable_fail_closed";}
 while(queues.length&&attempts<max&&!halted){
  const item=queues.shift();
  if(domioPageNumber(item.url,item.category)!==item.page||!robotsAllowed(robots,item.url,UA)){
   invalid++;reports.push({category:item.category,page:item.page,state:"disallowed_or_invalid"});continue;
  }
  if(attempts&&paceMs>0)await sleep(paceMs);
  attempts++;
  let res;
  try{res=await fetchImpl(item.url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(18000)});}
  catch{reports.push({category:item.category,page:item.page,state:"fetch_error"});continue;}
  if(res.status===403||res.status===429){halted="http_"+res.status;reports.push({category:item.category,page:item.page,state:halted});break;}
  if(res.status!==200||domioPageNumber(res.url,item.category)!==item.page||!HOSTS.has(new URL(res.url).hostname)){
   reports.push({category:item.category,page:item.page,state:res.status===200?"redirected_off_page":"http_"+res.status});continue;
  }
  if(!/html/i.test(res.headers?.get?.("content-type")||"")){
   reports.push({category:item.category,page:item.page,state:"non_html"});continue;
  }
  let html;
  try{html=await res.text();}catch{reports.push({category:item.category,page:item.page,state:"read_error"});continue;}
  if(Buffer.byteLength(html,"utf8")>3000000){reports.push({category:item.category,page:item.page,state:"oversized"});continue;}
  const result=parser(html,res.url),foundIds=new Set(result.rows.map(x=>x.identity));
  const allPreviouslySeen=foundIds.size>0&&[...foundIds].every(id=>originalIds.has(id));
  const repeated=foundIds.size>0&&item.prevIds&&[...foundIds].every(id=>item.prevIds.has(id));
  const next=linkedNextPage(html,res.url,item.category);
  ok++;
  const newlySeen=result.rows.filter(x=>!originalIds.has(x.identity)).length;
  reports.push({category:item.category,page:item.page,state:"observed",cards:result.rows.length,
   five_fields:result.rows.filter(x=>x.five_field_present).length,not_in_prior_70: newlySeen,
   next_link_present:!!next,overlaps_prior_70:allPreviouslySeen,repeated_previous_page:!!repeated});
  // Page 12 itself was counted in prior 70. Do not resave its duplicate cards.
  if(item.added>0)observations.push({seed:{url:item.category},rows:result.rows});
  if(repeated||allPreviouslySeen&&item.added>0){duplicateBranches++;continue;}
  if(next&&item.added<maxPer){
   queues.push({category:item.category,page:item.page+1,url:next,added:item.added+1,prevIds:foundIds});
  }
 }
 const merged=mergeDomioRows(observations);
 const rows=merged.rows.filter(x=>!originalIds.has(x.identity));
 return {report:{
  schema_version:"AKARFINDER_DOMIO_RESUMED_LINKED_PAGINATION_V1",
  semantics:"new_cards_after_verified_page12_only_not_freshness_certified",
  resume_sources:origins.length,max_requests:max,request_count:attempts,observed_pages:ok,
  unique_new_source_ids_vs_prior_70:rows.length,
  new_five_field_cards:rows.filter(x=>x.five_field_present&&!x.cross_page_conflict).length,
  repeated_id_observations:merged.duplicated,cross_page_conflict_rows:merged.conflicted,
  repeated_page_branches_stopped:duplicateBranches,skipped_or_invalid:invalid,
  queue_remaining:queues.length,halted_reason:halted,pages:reports,
  database_access:0,database_writes:0,
  note:"Continues only four categories with a proven page-12 Next link, re-fetches page 12 to verify link to 13, follows source-published Next links, and never requests details, private APIs or disallowed routes."
 },rows};
}

async function main(){
 const src=process.env.PRIOR_REPORT||".tmp/domio-70/domio-linked-pages-80.json";
 const rowsPath=process.env.PRIOR_ROWS||".tmp/domio-70/domio-linked-pages-80.jsonl";
 const referenceReport=JSON.parse(await fs.readFile(src,"utf8"));
 const referenceRows=(await fs.readFile(rowsPath,"utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
 const {report,rows}=await resumeDomioPagination({referenceReport,referenceRows,
  maxRequests:Number(process.env.MAX_REQUESTS||64),maxAdditionalPerCategory:Number(process.env.MAX_ADDITIONAL||12)});
 const prefix=process.env.OUTPUT_PREFIX||"domio-resume-after-page12";
 await fs.writeFile(prefix+".json",JSON.stringify(report,null,2)+"\n");
 await fs.writeFile(prefix+".jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+(rows.length?"\n":""));
 console.log(JSON.stringify({...report,pages:undefined},null,2));
 if(report.halted_reason||report.observed_pages===0)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error(e instanceof Error?e.message:"resume_failed");process.exitCode=1;});
}
