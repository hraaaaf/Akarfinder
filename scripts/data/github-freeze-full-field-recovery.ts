import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";
import { load } from "cheerio";
import { extractDetail } from "../scrapers/utils/extract.js";
import { extractStrictDetailPrice } from "../scrapers/price-detail-enrichment-v2.js";
import { resolveMubawabLocation } from "./mubawab-location-v2.js";
import { parseMubawabRoute } from "./mubawab-url-parser-v2.mjs";
import { extractMubawabStrictSurface } from "./mubawab-strict-surface-v2.js";
import { extractMubawabStrictSurfaceFromUrl } from "./mubawab-url-surface-v2.js";

async function main(){
const USER_AGENT="AkarFinderFullFieldRecovery/1.0";
const sourceName=(process.env.SOURCE_NAME||"domio.ma").toLowerCase();
const inputPath=process.env.FREEZE_JSONL_GZ||".tmp/freeze/clean-corpus-v4.11-core.jsonl.gz";
const outputPrefix=process.env.OUTPUT_PREFIX||`full-field-${sourceName.replace(/[^a-z0-9]+/g,"-")}`;
const limit=Math.max(1,Math.min(300,Number(process.env.SAMPLE_SIZE||100)));
const fetchDelayMs=Math.max(0,Number(process.env.FETCH_DELAY_MS||250));

type Row=Record<string,any>;
type Candidate={field:string,value:any,state:"write_safe"|"review"|"missing"|"contradicted";evidence:string;confidence:string};
const rank=(url:string)=>crypto.createHash("sha256").update(url).digest("hex");

const rows:Row[]=[];
const rl=readline.createInterface({input:createReadStream(inputPath).pipe(createGunzip()),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim()) continue;
  const row=JSON.parse(line);
  if(String(row.source_domain||"").toLowerCase()!==sourceName) continue;
  if(row.classification!=="KEEP"||row.scope_eligible!==true) continue;
  if(sourceName==="mubawab.ma"&&!parseMubawabRoute(row.canonical_url)) continue;
  rows.push(row);
}
rows.sort((a,b)=>rank(a.canonical_url).localeCompare(rank(b.canonical_url)));
const sample=rows.slice(0,limit);

function robotsAllowed(robots:string,url:string){
  const path=new URL(url).pathname||"/";
  const lines=robots.split(/\r?\n/).map(x=>x.replace(/#.*/,"").trim()).filter(Boolean);
  let applies=false; const dis:string[]=[]; const allow:string[]=[];
  for(const line of lines){
    const [rawK,...rest]=line.split(":"); const k=rawK.trim().toLowerCase(); const v=rest.join(":").trim();
    if(k==="user-agent"){ applies=v==="*"||v.toLowerCase()===USER_AGENT.toLowerCase(); continue; }
    if(!applies) continue;
    if(k==="disallow"&&v) dis.push(v);
    if(k==="allow"&&v) allow.push(v);
  }
  const best=(xs:string[])=>xs.filter(x=>path.startsWith(x)).sort((a,b)=>b.length-a.length)[0]||"";
  const a=best(allow),d=best(dis);
  return !d||a.length>=d.length;
}
const robotsCache=new Map<string,string|null>();
async function canFetch(url:string){
  const u=new URL(url); const origin=u.origin;
  if(!robotsCache.has(origin)){
    try{
      const r=await fetch(origin+"/robots.txt",{headers:{"user-agent":USER_AGENT},redirect:"follow"});
      robotsCache.set(origin,r.ok?await r.text():"");
    }catch{robotsCache.set(origin,null);}
  }
  const robots=robotsCache.get(origin);
  return robots!==null && robotsAllowed(robots||"",url);
}

function detectPropertyType(text:string){
  const t=text.toLowerCase();
  const defs:[string,RegExp][]=[
    ["apartment",/\b(?:appartement|apartment)\b/i],["studio",/\bstudio\b/i],["duplex",/\bduplex\b/i],
    ["villa",/\bvilla\b/i],["riad",/\briad\b/i],["house",/\b(?:maison|house)\b/i],["land",/\b(?:terrain|land)\b/i],
    ["office",/\b(?:bureau|office)\b/i],["commercial",/\b(?:local commercial|commerce|commercial)\b/i],
    ["warehouse",/\b(?:entrep[oô]t|warehouse)\b/i]
  ];
  const hits=defs.filter(([,re])=>re.test(t)).map(([v])=>v);
  return hits.length===1?hits[0]:null;
}
function detectTransaction(url:string,text:string){
  const u=decodeURIComponent(url.toLowerCase());
  const t=text.toLowerCase();
  const sale=/(?:\/|\b)(?:vente|vendre|a-vendre|acheter|achat|for-sale)(?:\/|\b|-)/i.test(u)||/\b(?:à|a) vendre\b|\bfor sale\b|للبيع/iu.test(t);
  const rent=/(?:\/|\b)(?:location|louer|a-louer|rental|for-rent)(?:\/|\b|-)/i.test(u)||/\b(?:à|a) louer\b|\bfor rent\b|للكراء/iu.test(t);
  return sale&&!rent?"sale":rent&&!sale?"rent":null;
}

function meta(html:string,key:string){
  const $=load(html);
  return ($(`meta[property="${key}"]`).attr("content")||$(`meta[name="${key}"]`).attr("content")||"").trim()||null;
}
function isSoftPage(title:string|null,desc:string){
  const t=(title||"").trim().toLowerCase();
  const d=(desc||"").trim().toLowerCase();
  return /^(?:404(?:\b|[-_])|accueil\b|acceuil\b|page not found\b|not found\b)/i.test(t)
    || /retour à l['’]accueil|retour a l['’]accueil|ce bien a été vendu|ce bien a ete vendu/i.test(d);
}
function isGenericListingTitle(title:string|null){
  const t=(title||"").replace(/\s+/g," ").trim();
  if(!t) return true;
  return /^(?:404(?:\b|[-_])|accueil\b|acceuil\b|page not found\b|not found\b)/i.test(t)
    || /^tous\s+les?\s+biens?\s+immobiliers?\b/i.test(t)
    || /^agence\s+immobili[eè]re\s+(?:à|a)(?=\s|$)/i.test(t);
}
function containsContactPii(value:string|null|undefined){
  const s=(value||"").replace(/\u00a0/g," ");
  if(!s) return false;
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(s)
    || /(?<!\d)(?:\+?212|0)\s*[5-7](?:[\s.\-]?\d){8}(?!\d)/i.test(s)
    || /\b(?:t[eé]l(?:[eé]phone)?|gsm|whats\s*app)\s*[:\-]?\s*(?:\+?212|0)?\s*[5-7](?:[\s.\-]?\d|\.{2,}){2,}/i.test(s)
    || /(?:wa\.me|api\.whatsapp\.com)/i.test(s);
}
const existingMap:Record<string,string[]>={
  property_type:["property_type"],transaction_type:["transaction_type"],price_mad:["normalized_price_mad","price_mad"],
  title:["title"],description:["description","description_snippet"],city:["city"],district:["district"],
  surface_m2:["surface_m2"],rooms_count:["rooms_count"],bedrooms_count:["bedrooms_count","bedrooms"],bathrooms_count:["bathrooms_count","bathrooms"],
  built_surface_m2:["built_surface_m2"],plot_surface_m2:["plot_surface_m2"],condition:["condition"],property_age_range:["property_age_range"],
  orientation:["orientation"],floor_type:["floor_type"],floors_count:["floors_count"],garden_m2:["garden_m2"],terrace_m2:["terrace_m2"],
  garage_spaces:["garage_spaces"],has_pool:["has_pool"],has_concierge:["has_concierge"],has_equipped_kitchen:["has_equipped_kitchen"],
  has_moroccan_living_room:["has_moroccan_living_room"],has_european_living_room:["has_european_living_room"],images_count:["images_count"],thumbnail_url:["thumbnail_url"]
};
function existing(row:Row,field:string){
  for(const k of existingMap[field]||[field]) if(row[k]!==null&&row[k]!==undefined&&row[k]!=="") return row[k];
  return null;
}
function norm(v:any){return typeof v==="string"?v.trim().toLowerCase():v;}
function add(out:Candidate[],row:Row,field:string,value:any,confidence:string,evidence:string,auto=false){
  if(value===null||value===undefined||value===""||value===false) return;
  const prior=existing(row,field);
  if(prior!==null){
    if(norm(prior)!==norm(value)) out.push({field,value,state:"contradicted",evidence,confidence});
    return;
  }
  out.push({field,value,state:auto&&confidence==="high"?"write_safe":"review",evidence,confidence});
}
const results:any[]=[];
for(const row of sample){
  const url=row.canonical_url; const rec:any={url,source:sourceName,http_status:null,robots_allowed:false,candidates:[]};
  if(!(await canFetch(url))){rec.blocked="robots";results.push(rec);continue;}
  rec.robots_allowed=true;
  let response:Response;
  try{response=await fetch(url,{headers:{"user-agent":USER_AGENT,"accept":"text/html,application/xhtml+xml"},redirect:"follow"});}
  catch{rec.blocked="fetch_error";results.push(rec);continue;}
  rec.http_status=response.status;
  if(response.status!==200){rec.blocked=`http_${response.status}`;results.push(rec);continue;}
  const html=await response.text();
  const d=extractDetail(html);
  const title=meta(html,"og:title");
  const desc=d.description_snippet||meta(html,"description")||meta(html,"og:description")||"";
  const softPage=isSoftPage(title,desc);
  const c:Candidate[]=[];
  if(!softPage && !isGenericListingTitle(title) && !containsContactPii(title)) add(c,row,"title",title,"high","meta:og:title",true);
  if(!softPage) add(c,row,"property_type",detectPropertyType([title,desc].filter(Boolean).join(" ")),"high","explicit:title_or_description_property_type",true);
  add(c,row,"transaction_type",detectTransaction(url,softPage?"":[title,desc].filter(Boolean).join(" ")),"high","explicit:url_or_primary_transaction",true);
  if(!softPage){
    const transaction=detectTransaction(url,[title,desc].filter(Boolean).join(" "));
    const strictPrice=extractStrictDetailPrice(html,transaction);
    add(c,row,"price_mad",strictPrice,strictPrice!=null?"high":"missing","extractStrictDetailPrice",strictPrice!=null);
    if(!containsContactPii(d.description_snippet)) add(c,row,"description",d.description_snippet,d._confidence.description,"extractDetail:description",d._confidence.description==="high");
    const location=sourceName==="mubawab.ma"?resolveMubawabLocation(html,d,title):{city:d.city,district:d.district,confidence:d._confidence.district,evidence:["extractDetail:district"]};
    add(c,row,"city",location.city,d._confidence.city,"extractDetail:city",d._confidence.city==="high");
    add(c,row,"district",location.district,location.confidence,location.evidence.join("+")||"extractDetail:district",location.confidence==="high");
  }
  if(!softPage){
  const s=d.surface_raw?.match(/([0-9]+(?:[.,][0-9]+)?)/)?.[1];
  const surfaceValue=s?Number(s.replace(",",".")):null;
  const validSurface=surfaceValue!=null && Number.isFinite(surfaceValue) && surfaceValue>0 ? surfaceValue : null;
  const surfaceAuto=d._confidence.surface==="high" && validSurface!=null && validSurface>=5 && validSurface<=100000;
  const strictDomSurface=sourceName==="mubawab.ma"?extractMubawabStrictSurface(html):null;
  const strictUrlSurface=sourceName==="mubawab.ma"?extractMubawabStrictSurfaceFromUrl(url):null;
  const strictSurface=strictDomSurface??strictUrlSurface;
  add(c,row,"surface_m2",strictSurface?.value??validSurface,strictSurface?.confidence??d._confidence.surface,strictSurface?.evidence??(validSurface!=null&&validSurface>100000?"extractDetail:surface_extreme_review":"extractDetail:surface"),!!strictSurface||surfaceAuto);
  add(c,row,"rooms_count",d.rooms,d._confidence.rooms,"extractDetail:rooms",d._confidence.rooms==="high");
  add(c,row,"bedrooms_count",d.bedrooms,d._confidence.bedrooms,"extractDetail:bedrooms",d._confidence.bedrooms==="high");
  add(c,row,"bathrooms_count",d.bathrooms,d._confidence.bathrooms,"extractDetail:bathrooms",d._confidence.bathrooms==="high");
  add(c,row,"images_count",d.images_count,"review","extractDetail:images_count",false);
  add(c,row,"thumbnail_url",d.thumbnail_url,"review","meta:og:image",false);
  for(const field of ["built_surface_m2","plot_surface_m2","condition","property_age_range","orientation","floor_type","floors_count","garden_m2","terrace_m2","garage_spaces","has_pool","has_concierge","has_equipped_kitchen","has_moroccan_living_room","has_european_living_room"]){
    add(c,row,field,(d as any)[field],"review",`extractDetail:p8a:${field}`,false);
  }
  }
  rec.candidates=c;
  results.push(rec);
  if(fetchDelayMs>0) await new Promise(resolve=>setTimeout(resolve,fetchDelayMs));
}

const accessibleCount=results.filter(x=>x.http_status===200).length;
const templateNoiseSuppressions:any[]=[];
const reviewAdvancedFields=new Set(["built_surface_m2","plot_surface_m2","condition","property_age_range","orientation","floor_type","floors_count","garden_m2","terrace_m2","garage_spaces","has_pool","has_concierge","has_equipped_kitchen","has_moroccan_living_room","has_european_living_room"]);
for(const field of reviewAdvancedFields){
  const candidates=results.flatMap(r=>r.candidates.filter((x:any)=>x.field===field&&x.state==="review").map((x:any)=>({row:r,candidate:x})));
  if(candidates.length<25||accessibleCount===0) continue;
  const frequencies=new Map<string,number>();
  for(const {candidate} of candidates){
    const k=JSON.stringify(candidate.value);
    frequencies.set(k,(frequencies.get(k)||0)+1);
  }
  const dominant=[...frequencies.entries()].sort((a,b)=>b[1]-a[1])[0];
  if(!dominant) continue;
  const [dominantValue,count]=dominant;
  if(count/accessibleCount>=0.5){
    for(const r of results) r.candidates=r.candidates.filter((x:any)=>!(x.field===field&&x.state==="review"&&JSON.stringify(x.value)===dominantValue));
    templateNoiseSuppressions.push({field,value:JSON.parse(dominantValue),count,accessible_count:accessibleCount,reason:"dominant_review_value_template_noise"});
  }
}
const counts:any={};
for(const r of results){
  for(const x of r.candidates){
    counts[x.field]??={write_safe:0,review:0,contradicted:0};
    counts[x.field][x.state]=(counts[x.field][x.state]||0)+1;
  }
}
const summary={
 schema_version:"AKARFINDER_FULL_FIELD_RECOVERY_V1",
 source:sourceName,freeze_population:rows.length,sample_size:sample.length,
 robots_allowed:results.filter(x=>x.robots_allowed).length,
 accessible_http_200:accessibleCount,
 candidates_by_field:counts,
 template_noise_suppressions:templateNoiseSuppressions,
 write_safe_fields:results.flatMap(x=>x.candidates).filter((x:any)=>x.state==="write_safe").length,
 review_fields:results.flatMap(x=>x.candidates).filter((x:any)=>x.state==="review").length,
 contradicted_fields:results.flatMap(x=>x.candidates).filter((x:any)=>x.state==="contradicted").length,
 database_access:0,database_writes:0,
 note:"Read-only full-field recovery includes strict detail price extraction; certification still requires freshness, all five mandatory fields, provenance validation, and deduplication."
};
await writeFile(outputPrefix+".json",JSON.stringify(summary,null,2)+"\n");
await writeFile(outputPrefix+".jsonl",results.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log(JSON.stringify(summary,null,2));

}

main().catch((error)=>{ console.error(error); process.exitCode=1; });
