import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";
import { load } from "cheerio";
import { extractDetail } from "../scrapers/utils/extract.js";

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
const existingMap:Record<string,string[]>={
  property_type:["property_type"],transaction_type:["transaction_type"],
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
const results:any[]=[]; const counts:any={};
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
  const c:Candidate[]=[];
  add(c,row,"title",title,"high","meta:og:title",true);
  add(c,row,"property_type",detectPropertyType([title,desc].filter(Boolean).join(" ")),"high","explicit:title_or_description_property_type",true);
  add(c,row,"transaction_type",detectTransaction(url,[title,desc].filter(Boolean).join(" ")),"high","explicit:url_or_primary_transaction",true);
  add(c,row,"description",d.description_snippet,d._confidence.description,"extractDetail:description",d._confidence.description==="high");
  add(c,row,"city",d.city,d._confidence.city,"extractDetail:city",d._confidence.city==="high");
  add(c,row,"district",d.district,d._confidence.district,"extractDetail:district",d._confidence.district==="high");
  const s=d.surface_raw?.match(/([0-9]+(?:[.,][0-9]+)?)/)?.[1];
  const surfaceValue=s?Number(s.replace(",",".")):null;
  const surfaceAuto=d._confidence.surface==="high" && surfaceValue!=null && surfaceValue>=5 && surfaceValue<=100000;
  add(c,row,"surface_m2",surfaceValue,d._confidence.surface,surfaceValue!=null&&surfaceValue>100000?"extractDetail:surface_extreme_review":"extractDetail:surface",surfaceAuto);
  add(c,row,"rooms_count",d.rooms,d._confidence.rooms,"extractDetail:rooms",d._confidence.rooms==="high");
  add(c,row,"bedrooms_count",d.bedrooms,d._confidence.bedrooms,"extractDetail:bedrooms",d._confidence.bedrooms==="high");
  add(c,row,"bathrooms_count",d.bathrooms,d._confidence.bathrooms,"extractDetail:bathrooms",d._confidence.bathrooms==="high");
  add(c,row,"images_count",d.images_count,"review","extractDetail:images_count",false);
  add(c,row,"thumbnail_url",d.thumbnail_url,"review","meta:og:image",false);
  for(const field of ["built_surface_m2","plot_surface_m2","condition","property_age_range","orientation","floor_type","floors_count","garden_m2","terrace_m2","garage_spaces","has_pool","has_concierge","has_equipped_kitchen","has_moroccan_living_room","has_european_living_room"]){
    add(c,row,field,(d as any)[field],"review",`extractDetail:p8a:${field}`,false);
  }
  rec.candidates=c;
  for(const x of c){counts[x.field]??={write_safe:0,review:0,contradicted:0};counts[x.field][x.state]=(counts[x.field][x.state]||0)+1;}
  results.push(rec);
  if(fetchDelayMs>0) await new Promise(resolve=>setTimeout(resolve,fetchDelayMs));
}
const summary={
 schema_version:"AKARFINDER_FULL_FIELD_RECOVERY_V1",
 source:sourceName,freeze_population:rows.length,sample_size:sample.length,
 robots_allowed:results.filter(x=>x.robots_allowed).length,
 accessible_http_200:results.filter(x=>x.http_status===200).length,
 candidates_by_field:counts,
 write_safe_fields:results.flatMap(x=>x.candidates).filter((x:any)=>x.state==="write_safe").length,
 review_fields:results.flatMap(x=>x.candidates).filter((x:any)=>x.state==="review").length,
 contradicted_fields:results.flatMap(x=>x.candidates).filter((x:any)=>x.state==="contradicted").length,
 database_access:0,database_writes:0,
 note:"Price and transaction strict recovery remain governed by the certified semantic recovery pipeline; this pass expands non-price canonical fields."
};
await writeFile(outputPrefix+".json",JSON.stringify(summary,null,2)+"\n");
await writeFile(outputPrefix+".jsonl",results.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log(JSON.stringify(summary,null,2));

}

main().catch((error)=>{ console.error(error); process.exitCode=1; });
