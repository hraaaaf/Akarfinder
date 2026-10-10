import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {load} from "cheerio";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";

const UA="AkarFinderSaroutyPublicCanary/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["sarouty.ma","www.sarouty.ma"]);
export const SEEDS=[
 "https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/",
 "https://www.sarouty.ma/acheter/rabat/appartements-a-vendre/"
];
const clean=x=>String(x??"").replace(/[\u00a0\u202f]/g," ").replace(/\s+/g," ").trim();
const hash=x=>createHash("sha256").update(x).digest("hex").slice(0,20);

export function saroutyCrawlDelay(robots,ua=UA){
 const lines=String(robots||"").split(/\r?\n/);
 let agents=[],rules=[],groups=[];
 const flush=()=>{if(agents.length)groups.push({agents:[...agents],rules:[...rules]});agents=[];rules=[];};
 for(const raw of lines){
  const line=raw.split("#")[0].trim(),i=line.indexOf(":");if(i<0)continue;
  const key=line.slice(0,i).trim().toLowerCase(),value=line.slice(i+1).trim();
  if(key==="user-agent"){if(rules.length)flush();agents.push(value.toLowerCase());}
  else if(key==="crawl-delay"||key==="allow"||key==="disallow")rules.push({key,value});
 }
 flush();
 const matches=groups.flatMap(g=>g.agents.filter(a=>a==="*"||ua.toLowerCase().includes(a)).map(a=>({specificity:a==="*"?0:a.length,rules:g.rules})));
 const specificity=Math.max(0,...matches.map(x=>x.specificity));
 const delays=[];
 for(const g of matches.filter(x=>x.specificity===specificity))for(const r of g.rules){
  if(r.key!=="crawl-delay")continue;
  const n=Number(r.value);
  if(!Number.isFinite(n)||n<0||n>3600) return null;
  delays.push(n);
 }
 return Math.max(0,...delays);
}

export function probeSaroutyCards(html,pageUrl){
 const $=load(html),seen=new Set();
 let evidence=0,candidates=0,prices=0,surfaces=0;
 for(const a of $("a[href]").toArray()){
  let u;try{u=new URL($(a).attr("href"),pageUrl);}catch{continue;}
  if(u.protocol!=="https:"||!HOSTS.has(u.hostname.toLowerCase())||u.href===pageUrl||u.search||u.hash)continue;
  if(u.pathname.match(/^\/(?:acheter|louer)\/(?:casablanca|rabat)\/appartements-a-(?:vendre|louer)\/?$/))continue;
  let root=$(a).closest("article,[class*='property-card'],[class*='listing-card'],[class*='propertyCard']");
  if(!root.length){
   for(const p of $(a).parents().slice(0,5).toArray()){
    const node=$(p),text=clean(node.text());
    if(text.length>1800)continue;
    if(/\b(?:DH|MAD)\b/i.test(text)&&/\d+\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/iu.test(text)){root=node;break;}
   }
  }
  if(!root.length)continue;
  const text=clean(root.text());
  const hasPrice=/\d[\d\s.,]{2,}\s*(?:DH|MAD)\b/i.test(text);
  const hasSurface=/\d+(?:[.,]\d+)?\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/iu.test(text);
  if(!hasPrice&&!hasSurface)continue;
  candidates++;
  if(hasPrice)prices++;
  if(hasSurface)surfaces++;
  if(hasPrice&&hasSurface&&!seen.has(hash(u.href))){evidence++;seen.add(hash(u.href));}
 }
 return {candidate_anchors:candidates,price_scoped_anchors:prices,surface_scoped_anchors:surfaces,
  distinct_card_link_evidence:evidence,source_ids_certified:0,five_fields_certified:0,
  note:"Links are hashed and only indicate card-like DOM. Do not treat as listing IDs, publishable data or freshness proof."};
}

export async function runSaroutyCanary({fetchImpl=globalThis.fetch,robotsText=null,sleep=ms=>new Promise(r=>setTimeout(r,ms)),seeds=SEEDS}={}){
 let robots=robotsText,halted=null;
 if(robots===null)try{
  const response=await fetchImpl("https://www.sarouty.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(response.status!==200)throw Error("robots status");
  robots=await response.text();if(!robots||robots.length>120000)throw Error("robots invalid");
 }catch{halted="robots_unavailable_fail_closed";}
 const delay=robots===null?null:saroutyCrawlDelay(robots);
 if(delay===null)halted="robots_crawl_delay_invalid";
 const rows=[];let requests=0;
 for(const seed of seeds.slice(0,2)){
  if(halted)break;
  if(!robotsAllowed(robots,seed,UA)){rows.push({route:"category",state:"robots_disallowed"});continue;}
  if(requests>0)await sleep(Math.max(10000,Math.ceil(delay*1000)));
  requests++;
  try{
   const response=await fetchImpl(seed,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(18000)});
   if([403,429].includes(response.status)){halted="http_"+response.status;rows.push({route:"category",state:halted});break;}
   if(response.status!==200){rows.push({route:"category",state:"http_"+response.status});continue;}
   const final=new URL(response.url),initial=new URL(seed);
   if(!HOSTS.has(final.hostname)||final.pathname.replace(/\/+$/,"")!==initial.pathname.replace(/\/+$/,"")){
    rows.push({route:"category",state:"redirected_out_of_category"});continue;
   }
   if(!/html/i.test(response.headers?.get?.("content-type")||"")){rows.push({route:"category",state:"non_html"});continue;}
   const html=await response.text();if(Buffer.byteLength(html)>3000000){rows.push({route:"category",state:"oversized"});continue;}
   rows.push({route:"category",state:"observed",...probeSaroutyCards(html,response.url)});
  }catch{rows.push({route:"category",state:"fetch_error"});}
 }
 return {schema_version:"AKARFINDER_SAROUTY_PUBLIC_DOM_CANARY_V1",semantics:"link_scope_diagnostic_only_neither_listing_count_nor_freshness",
  categories_requested:Math.min(2,seeds.length),category_requests:requests,robots_checked:!!robots,
  crawl_delay_seconds:delay,halted_reason:halted,pages:rows,database_access:0,database_writes:0,
  publication_count:0,source_ids_certified:0,five_fields_certified:0};
}

async function main(){
 const report=await runSaroutyCanary();
 const prefix=process.env.OUTPUT_PREFIX||"sarouty-card-canary";
 await fs.writeFile(prefix+".json",JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
 if(report.halted_reason||!report.pages.some(p=>p.state==="observed"))process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
