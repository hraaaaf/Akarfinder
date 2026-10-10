import {load} from "cheerio";
import {robotsAllowed} from "./mubawab-result-cards-v1.mjs";
const UA="AkarFinderDomioAuditV1/1.0 (+https://akarfinder.ma)";
const HOSTS=new Set(["domio.ma","www.domio.ma"]);
const clean=x=>String(x||"").replace(/[\u00a0\u202f]/g," ").replace(/\s+/g," ").trim();
const money=x=>Number(clean(x).replace(/\s/g,"").replace(",","."));
export function domioDetailIdentity(url){
 try{
  const u=new URL(url);
  if(u.protocol!=="https:"||!HOSTS.has(u.hostname.toLowerCase()))return null;
  const m=u.pathname.match(/^\/fr\/[a-z-]+\/(?:vendre|louer)\/[a-z-]+\/(?:[a-z0-9-]+\/)?(\d{2,9})\/[^/]+\/?$/i);
  return m?"domio:"+m[1]:null;
 }catch{return null;}
}
export function inspectDomioDetail(html,requestedUrl,finalUrl,row,status=200){
 const expected=row.identity;
 const stable=domioDetailIdentity(requestedUrl)===expected&&domioDetailIdentity(finalUrl)===expected;
 const $=load(html),title=clean($("h1").first().text()),body=clean($("body").text());
 const id=expected.replace(/^domio:/,"");
 const reference=/^\d+$/.test(id)&&new RegExp("\\bDOM-"+id+"\\b","i").test(body);
 const primary=stable&&status===200&&title.length>=3&&title.length<160&&reference;
 const prices=new Set(),surfaces=new Set(),dates=new Set();
 if(primary){
  for(const m of body.matchAll(/\bPrix\s+([\d \u00a0\u202f]{3,})\s*DH\b/giu)){
   const value=money(m[1]);if(Number.isSafeInteger(value)&&value>0&&value<1e10)prices.add(value);
  }
  for(const m of body.matchAll(/\bSurface\s+(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?![\p{L}\p{N}])/giu)){
   const value=money(m[1]);if(Number.isFinite(value)&&value>=5&&value<=100000)surfaces.add(value);
  }
  for(const m of body.matchAll(/Publié\s+le\s+(\d{2})\/(\d{2})\/(\d{4})/giu)){
   const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
   if(d.getUTCFullYear()===+m[3]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1])dates.add(d.toISOString().slice(0,10));
  }
 }
 const price=prices.size===1?[...prices][0]:null;
 const surface=surfaces.size===1?[...surfaces][0]:null;
 const date=dates.size===1?[...dates][0]:null;
 const age=date?Math.floor((Date.now()-Date.parse(date+"T00:00:00Z"))/86400000):null;
 return {identity:expected,http_status:status,identity_preserved:stable,reference_matches:reference,primary_detail_verified:primary,
  price_matches_card:price===null?null:price===row.price_mad,
  surface_matches_card:surface===null?null:surface===row.surface_m2,
  published_at_observed:date,published_days_ago:age!==null&&age>=0&&age<36500?age:null,
  ambiguous_fields:prices.size>1||surfaces.size>1||dates.size>1,
  freshness_certified:false,active_sale_verified:false,database_writes:0};
}
export function selectDomioSample(rows,max=12){
 const groups=new Map();
 for(const row of rows){
  if(!row.five_field_present||!/^domio:\d+$/.test(row.identity)||domioDetailIdentity(row.url)!==row.identity)continue;
  const city=row.city||"unknown";
  if(!groups.has(city))groups.set(city,[]);
  groups.get(city).push(row);
 }
 const sample=[];
 for(const [,items] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
  items.sort((a,b)=>Number(b.identity.slice(6))-Number(a.identity.slice(6)));
  sample.push(...items.slice(0,Math.ceil(Math.min(12,max)/Math.max(1,groups.size))));
 }
 return sample.slice(0,Math.min(12,max));
}
export async function auditDomioDetails({rows,fetchImpl=globalThis.fetch,robotsText=null,max=12,paceMs=1700,
 sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const sample=selectDomioSample(rows,max),observations=[];
 let robots=robotsText,halted=null,requests=0;
 if(robots===null)try{
  const r=await fetchImpl("https://domio.ma/robots.txt",{headers:{"user-agent":UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error("robots");
  robots=await r.text();if(!robots)throw Error("empty robots");
 }catch{halted="robots_unavailable_fail_closed";}
 for(const row of sample){
  if(halted)break;
  if(!robotsAllowed(robots,row.url,UA)){observations.push({identity:row.identity,state:"robots_disallowed"});continue;}
  if(requests&&paceMs)await sleep(paceMs);
  requests++;
  let response;
  try{response=await fetchImpl(row.url,{redirect:"follow",headers:{"user-agent":UA,accept:"text/html,application/xhtml+xml","accept-language":"fr-MA,fr;q=0.9"},signal:AbortSignal.timeout(16000)});}
  catch{observations.push({identity:row.identity,state:"fetch_error"});continue;}
  if(response.status===403||response.status===429){halted="http_"+response.status;observations.push({identity:row.identity,state:halted});break;}
  if(response.status!==200){observations.push({identity:row.identity,state:"non_200",http_status:response.status});continue;}
  if(!/html/i.test(response.headers?.get?.("content-type")||"")){observations.push({identity:row.identity,state:"non_html"});continue;}
  try{
   const html=await response.text();
   if(Buffer.byteLength(html,"utf8")>3000000){observations.push({identity:row.identity,state:"oversized"});continue;}
   observations.push(inspectDomioDetail(html,row.url,response.url,row,response.status));
  }catch{observations.push({identity:row.identity,state:"parse_error"});}
 }
 const count=k=>observations.filter(x=>x[k]===true).length;
 return {report:{schema_version:"AKARFINDER_DOMIO_DETAIL_AUDIT_V1",
  semantics:"sampled_detail_provenance_and_published_date_only_not_active_sale_certification",
  selected:sample.length,detail_requests:requests,halted_reason:halted,
  identity_preserved:count("identity_preserved"),primary_verified:count("primary_detail_verified"),
  price_matches:count("price_matches_card"),surface_matches:count("surface_matches_card"),
  price_conflicts:observations.filter(x=>x.price_matches_card===false).length,
  surface_conflicts:observations.filter(x=>x.surface_matches_card===false).length,
  publication_dates_observed:observations.filter(x=>x.published_at_observed).length,
  database_access:0,database_writes:0,
  note:"Published date and reachable page do not prove property is still for sale; no republication rights implied."
 },observations};
}
