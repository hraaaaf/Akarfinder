import { writeFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const USER_AGENT = "AkarFinderRecoveryAudit";
const sourceName = (process.env.SOURCE_NAME || "marocimmo.com").toLowerCase();
const outputPrefix = process.env.OUTPUT_PREFIX || "marocimmo-recovery-benchmark";
const targetId = process.env.TARGET_ID || null;
const sql = neon(process.env.DATABASE_URL);
const limit = Math.max(1, Math.min(300, Number(process.env.SAMPLE_SIZE || 120)));

const rows = await sql`
  SELECT p.id,p.title,p.price_mad,p.surface_m2,p.city,p.district,p.property_type,
         p.transaction_type,p.rooms_count,p.bedrooms_count,p.bathrooms_count,
         s.listing_url,s.price_status
  FROM property_listings p
  JOIN listing_sources s ON s.property_listing_id=p.id
  WHERE lower(s.source_name)=${sourceName}
    AND (${targetId}::text IS NULL OR p.id::text=${targetId})
    AND (p.price_mad IS NULL OR p.surface_m2 IS NULL OR p.district IS NULL
         OR p.rooms_count IS NULL OR p.bedrooms_count IS NULL OR p.bathrooms_count IS NULL)
    AND s.listing_url IS NOT NULL
  ORDER BY md5(p.id::text)
  LIMIT ${limit}
`;

const amountRe=/([0-9]{1,3}(?:[ .,'’][0-9]{3})+|[0-9]{4,10})\s*(?:mad|dhs?|dh|dirhams?)/giu;
const surfaceRe=/([0-9]{1,7})\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/giu;
const onRequestRe=/\b(?:prix\s+(?:sur|a|à)\s+demande|price\s+on\s+request)\b/iu;
const patterns={
  bedrooms:[/(?:chambres?|bedrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:chambres?|bedrooms?)\b/giu],
  bathrooms:[/(?:salles?\s*de\s*bain|sdb|bathrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:salles?\s*de\s*bain|sdb|bathrooms?)\b/giu],
  rooms:[/(?:pi[eè]ces?|rooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:pi[eè]ces?|rooms?)\b/giu],
};
function unique(re,text){
  re.lastIndex=0;
  return [...new Set([...text.matchAll(re)].map(m=>Number(m[1].replace(/[^0-9]/g,''))).filter(Number.isFinite))];
}
function one(re,text){const v=unique(re,text);return v.length===1?v[0]:null;}
function oneAny(res,text){const v=[...new Set(res.flatMap(re=>unique(re,text)))];return v.length===1?v[0]:null;}
function metaContent(html,key){
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  const target=key.toLowerCase();
  for(const tag of tags){
    const property=(tag.match(/\bproperty\s*=\s*["']([^"']+)["']/i)||[])[1]?.toLowerCase();
    const name=(tag.match(/\bname\s*=\s*["']([^"']+)["']/i)||[])[1]?.toLowerCase();
    if(property!==target && name!==target) continue;
    const content=(tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)||[])[1];
    if(content!=null) return content.slice(0,1200);
  }
  return null;
}
function structuredEvidence(html){
  const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,1200)||null;
  const nodes=[];
  for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const parsed=JSON.parse(match[1]);
      const stack=Array.isArray(parsed)?parsed:[parsed];
      for(const item of stack){
        if(item && typeof item==="object" && Array.isArray(item["@graph"])) nodes.push(...item["@graph"]);
        else nodes.push(item);
      }
    }catch{}
  }
  const listing=nodes.find(node=>{
    const t=node?.["@type"];
    return t==="RealEstateListing" || (Array.isArray(t)&&t.includes("RealEstateListing"));
  })||null;
  const projected=listing?{
    type:listing["@type"]??null,
    name:listing.name??null,
    description:listing.description??null,
    url:listing.url??null,
    datePosted:listing.datePosted??null,
    dateModified:listing.dateModified??null,
    category:listing.category??null,
    address:listing.address??null,
    offers:listing.offers??null,
    floorSize:listing.floorSize??null,
    numberOfRooms:listing.numberOfRooms??null,
    numberOfBedrooms:listing.numberOfBedrooms??null,
    numberOfBathroomsTotal:listing.numberOfBathroomsTotal??listing.numberOfBathrooms??null
  }:null;
  return {title,og_title:metaContent(html,'og:title'),og_description:metaContent(html,'og:description'),description:metaContent(html,'description'),real_estate_listing:projected};
}
function htmlToText(html){
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
}

function numericValue(v){
  if(v==null || v==="") return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}
function cadenceFrom(text,category){
  const hay=(String(text||"")+" "+String(category||"")).toLowerCase();
  const nonMonthly=/(?:par\s*jour|journalier|quotidien|journ[ée]e|nuit[ée]?e?|courte\s+dur[ée]e|location\s+vacances|vacances|\bعطلات\b|\bيومي|\bليلة)/iu.test(hay);
  const monthly=/(?:par\s*mois|\/\s*mois|mensuel(?:le)?|loyer\s+mensuel|\bشهري(?:ا|ًا)?\b)/iu.test(hay);
  if(nonMonthly&&monthly) return "mixed";
  if(nonMonthly) return "non_monthly";
  if(monthly) return "monthly";
  return "unknown";
}
function saroutPriceCandidate(listing,text){
  const offers=Array.isArray(listing?.offers)?listing.offers:[listing?.offers].filter(Boolean);
  const prices=[...new Set(offers.map(o=>numericValue(o?.price)).filter(v=>v!=null))];
  const currencies=[...new Set(offers.map(o=>String(o?.priceCurrency||"").toUpperCase()).filter(Boolean))];
  if(prices.length!==1) return {value:null,reason:prices.length?"multiple_offers":"no_offer",period:"unknown"};
  if(currencies.length && !currencies.includes("MAD")) return {value:null,reason:"non_mad",period:"unknown"};
  const value=prices[0];
  const cat=String(listing?.category||"").toLowerCase();
  const sale=/vente|بيع/u.test(cat);
  const rent=/location|إيجار|عطلات/u.test(cat);
  const period=cadenceFrom(text,cat);
  if(sale) return value>=10000?{value,reason:null,period:"sale"}:{value:null,reason:"sale_too_low",period:"sale"};
  if(rent){
    if(period==="mixed") return {value:null,reason:"mixed_cadence",period};
    if(period==="non_monthly") return {value:null,reason:"non_monthly",period};
    if(/vacances|عطلات/u.test(cat) && period!=="monthly") return {value:null,reason:"vacation_without_monthly_proof",period};
    return value>=1000?{value,reason:null,period:period==="monthly"?"monthly":"unknown"}:{value:null,reason:"rent_too_low",period};
  }
  return {value:null,reason:"unknown_transaction_category",period};
}
function saroutMainText(text,title){
  const tl=(title||"").trim();
  const start=tl?text.toLowerCase().indexOf(tl.toLowerCase()):-1;
  if(start<0) return null;
  const tail=text.slice(start);
  const markers=["Annonces similaires","Biens similaires","Voir aussi","Propriétés similaires","Vous pourriez aussi aimer"];
  let end=tail.length;
  for(const marker of markers){
    const i=tail.toLowerCase().indexOf(marker.toLowerCase());
    if(i>0&&i<end) end=i;
  }
  return tail.slice(0,Math.min(end,12000));
}
function extract(html,title){
  const fullText=htmlToText(html);
  const structured=sourceName==="sarout.ma"?structuredEvidence(html):null;
  const listing=structured?.real_estate_listing||null;
  const structuredText=[listing?.name,listing?.description,structured?.og_title,structured?.og_description,structured?.description].filter(Boolean).join(" ");
  const text=sourceName==="sarout.ma"?(structuredText||saroutMainText(fullText,title)||""):fullText;
  const onRequest=onRequestRe.test(text);
  onRequestRe.lastIndex=0;
  const rawMatches=[...text.matchAll(amountRe)].slice(0,12);
  amountRe.lastIndex=0;
  const rawPrices=[...new Set(rawMatches.map(m=>Number(m[1].replace(/[^0-9]/g,''))).filter(x=>Number.isFinite(x)&&x>=100&&x<=500000000))];
  const evidence=rawMatches.map(m=>({
    value:Number(m[1].replace(/[^0-9]/g,'')),
    context:text.slice(Math.max(0,(m.index||0)-90),Math.min(text.length,(m.index||0)+m[0].length+90))
  }));
  const saroutPrice=sourceName==="sarout.ma"?saroutPriceCandidate(listing,text):null;
  const directSurface=sourceName==="sarout.ma"&&listing?.floorSize?.unitCode==="MTK"?numericValue(listing.floorSize.value):null;
  const directBedrooms=sourceName==="sarout.ma"?numericValue(listing?.numberOfBedrooms):null;
  const directBathrooms=sourceName==="sarout.ma"?numericValue(listing?.numberOfBathroomsTotal):null;
  return {
    structured_evidence: structured,
    price_status_candidate:onRequest?"on_request":null,
    price_mad:sourceName==="sarout.ma"?(saroutPrice?.value??null):(!onRequest&&rawPrices.length===1?rawPrices[0]:null),
    price_rejection_reason:sourceName==="sarout.ma"?(saroutPrice?.reason??null):null,
    price_period_candidate:sourceName==="sarout.ma"?(saroutPrice?.period??"unknown"):null,
    price_candidates:sourceName==="sarout.ma"?(saroutPrice?.value!=null?1:0):(onRequest?0:rawPrices.length),
    ancillary_price_values:onRequest?rawPrices:[],
    price_evidence:evidence,
    surface_m2:directSurface??one(surfaceRe,text),
    bedrooms_count:directBedrooms??oneAny(patterns.bedrooms,text),
    bathrooms_count:directBathrooms??oneAny(patterns.bathrooms,text),
    rooms_count:oneAny(patterns.rooms,text),
    room_evidence:[...patterns.rooms.flatMap(re=>{re.lastIndex=0;return [...text.matchAll(re)].map(m=>({value:Number(m[1]),context:text.slice(Math.max(0,(m.index||0)-90),Math.min(text.length,(m.index||0)+m[0].length+90))}));})].slice(0,12)
  };
}

const robotsCache=new Map();
function parseRobots(text){
  const lines=text.split(/\r?\n/).map(x=>x.replace(/#.*/,'').trim()).filter(Boolean);
  const groups=[]; let current=null;
  for(const line of lines){
    const i=line.indexOf(':'); if(i<0) continue;
    const key=line.slice(0,i).trim().toLowerCase(), value=line.slice(i+1).trim();
    if(key==='user-agent'){
      if(!current || current.rules.length){current={agents:[],rules:[]};groups.push(current);}
      current.agents.push(value.toLowerCase());
    } else if(current && (key==='allow'||key==='disallow')) current.rules.push({kind:key,path:value});
  }
  return groups;
}
async function robotsFor(url){
  const origin=new URL(url).origin;
  if(robotsCache.has(origin)) return robotsCache.get(origin);
  try{
    const res=await fetch(origin+'/robots.txt',{signal:AbortSignal.timeout(5000),headers:{"user-agent":USER_AGENT+"/1.0"}});
    if(res.status===404||res.status===410){const v={state:'absent',groups:[]};robotsCache.set(origin,v);return v;}
    if(!res.ok){const v={state:'unknown',groups:[]};robotsCache.set(origin,v);return v;}
    const v={state:'loaded',groups:parseRobots(await res.text())};robotsCache.set(origin,v);return v;
  }catch{
    const v={state:'unknown',groups:[]};robotsCache.set(origin,v);return v;
  }
}
function robotsAllows(url,robots){
  if(robots.state==='absent') return true;
  if(robots.state!=='loaded') return false;
  const ua=USER_AGENT.toLowerCase(), path=new URL(url).pathname||'/';
  const specific=robots.groups.filter(g=>g.agents.some(a=>a===ua));
  const groups=specific.length?specific:robots.groups.filter(g=>g.agents.includes('*'));
  if(!groups.length) return true;
  const matches=groups.flatMap(g=>g.rules).filter(r=>r.path && path.startsWith(r.path));
  if(!matches.length) return true;
  matches.sort((a,b)=>b.path.length-a.path.length);
  return matches[0].kind==='allow';
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const results=[];
for(const r of rows){
  const started=Date.now();
  const robots=await robotsFor(r.listing_url);
  if(!robotsAllows(r.listing_url,robots)){
    results.push({id:r.id,title:r.title,url:r.listing_url,stored:{price_mad:r.price_mad,price_status:r.price_status,surface_m2:r.surface_m2,district:r.district,transaction_type:r.transaction_type,property_type:r.property_type,rooms_count:r.rooms_count,bedrooms_count:r.bedrooms_count,bathrooms_count:r.bathrooms_count},robots:robots.state,robots_allowed:false,http_status:null,accessible:false,elapsed_ms:Date.now()-started,extracted:null});
    continue;
  }
  try{
    const res=await fetch(r.listing_url,{redirect:"follow",signal:AbortSignal.timeout(8000),headers:{"user-agent":USER_AGENT+"/1.0 (+read-only benchmark)","accept":"text/html"}});
    const ct=res.headers.get("content-type")||"";
    const html=res.ok&&ct.includes("text/html")?await res.text():"";
    const titleSurface=(r.title.match(/\b(\d{2,5})\s*m(?:²|2)?\b/i)||[])[1];
    const slug=decodeURIComponent(new URL(r.listing_url).pathname).toLowerCase();
    const slugSurface=(slug.match(/(?:^|[-_/])(\d{2,5})[-_]?m(?:2)?(?:[-_/]|$)/i)||[])[1];
    const locationTail=(slug.match(/casablanca[-_/]+(.+?)(?:$|[?#])/i)||[])[1]?.replace(/[-_]+/g,' ')||null;
    results.push({id:r.id,title:r.title,url:r.listing_url,stored:{price_mad:r.price_mad,price_status:r.price_status,surface_m2:r.surface_m2,district:r.district,transaction_type:r.transaction_type,property_type:r.property_type,rooms_count:r.rooms_count,bedrooms_count:r.bedrooms_count,bathrooms_count:r.bathrooms_count},structural_candidates:{surface_title_m2:titleSurface?Number(titleSurface):null,surface_slug_m2:slugSurface?Number(slugSurface):null,location_slug:locationTail},robots:robots.state,robots_allowed:true,http_status:res.status,accessible:res.ok&&html.length>0,elapsed_ms:Date.now()-started,extracted:html?extract(html,r.title):null});
  }catch(e){
    results.push({id:r.id,title:r.title,url:r.listing_url,stored:{price_mad:r.price_mad,price_status:r.price_status,surface_m2:r.surface_m2,district:r.district,transaction_type:r.transaction_type,property_type:r.property_type,rooms_count:r.rooms_count,bedrooms_count:r.bedrooms_count,bathrooms_count:r.bathrooms_count},robots:robots.state,robots_allowed:true,http_status:null,accessible:false,elapsed_ms:Date.now()-started,error:e?.name||"fetch_error",extracted:null});
  }
  await sleep(250);
}
function auditCandidate(row){
  const e=row.extracted||{};
  const out={price:{status:"none",reason:null},surface:{status:"none",reason:null},rooms:{status:"none",reason:null},bedrooms:{status:"none",reason:null},bathrooms:{status:"none",reason:null}};
  if(row.stored?.price_mad==null && e.price_mad!=null){
    if(e.price_period_candidate==="sale" || e.price_period_candidate==="monthly") out.price={status:"write_safe",reason:e.price_period_candidate};
    else out.price={status:"quarantine",reason:e.price_period_candidate||"unknown_cadence"};
  } else if(row.stored?.price_mad==null && e.price_rejection_reason) out.price={status:"rejected",reason:e.price_rejection_reason};

  if(row.stored?.surface_m2==null && e.surface_m2!=null){
    const direct=row.extracted?.structured_evidence?.real_estate_listing?.floorSize;
    out.surface={status:direct?.unitCode==="MTK"?"write_safe":"review",reason:direct?.unitCode==="MTK"?"jsonld_floorSize":"text_evidence"};
  }
  if(row.stored?.rooms_count==null && e.rooms_count!=null) out.rooms={status:"write_safe",reason:"explicit_labeled_text"};
  if(row.stored?.bedrooms_count==null && e.bedrooms_count!=null) out.bedrooms={status:"write_safe",reason:"structured_or_explicit_labeled"};
  if(row.stored?.bathrooms_count==null && e.bathrooms_count!=null) out.bathrooms={status:"write_safe",reason:"structured_or_explicit_labeled"};
  return out;
}
for(const row of results) row.audit=auditCandidate(row);

const fields=["price_mad","surface_m2","bedrooms_count","bathrooms_count","rooms_count"];
const summary={source:sourceName,sample_requested:limit,sample_size:results.length,
  robots_allowed:results.filter(x=>x.robots_allowed).length,robots_blocked:results.filter(x=>x.robots_allowed===false).length,
  accessible:results.filter(x=>x.accessible).length,http_statuses:{},recovered:{},missing:{},recovered_missing:{},price_on_request:0,ambiguous_price:0,price_rejections:{},
  note:"Read-only bounded benchmark; robots.txt fail-closed; on-request overrides page-wide monetary noise; extracted values are candidates only and are not written to Neon.",write_safe:{},quarantine:{}};
for(const x of results){
  const k=String(x.http_status??(x.robots_allowed===false?"robots_blocked":"error"));
  summary.http_statuses[k]=(summary.http_statuses[k]||0)+1;
  for(const field of fields){ if(x.stored?.[field]==null) summary.missing[field]=(summary.missing[field]||0)+1; }
  if(x.extracted){
    if(x.extracted.price_status_candidate==="on_request") summary.price_on_request++;
    if(x.extracted.price_rejection_reason) summary.price_rejections[x.extracted.price_rejection_reason]=(summary.price_rejections[x.extracted.price_rejection_reason]||0)+1;
    for(const field of fields){
      if(x.extracted[field]!=null) summary.recovered[field]=(summary.recovered[field]||0)+1;
      if(x.stored?.[field]==null && x.extracted[field]!=null) summary.recovered_missing[field]=(summary.recovered_missing[field]||0)+1;
    }
    if(x.extracted.price_candidates>1) summary.ambiguous_price++;
  }
  for(const [field,a] of Object.entries(x.audit||{})){
    if(a.status==="write_safe") summary.write_safe[field]=(summary.write_safe[field]||0)+1;
    if(a.status==="quarantine") summary.quarantine[field]=(summary.quarantine[field]||0)+1;
  }
}
await writeFile(`${outputPrefix}.json`,JSON.stringify(summary,null,2)+"\\n");
await writeFile(`${outputPrefix}.jsonl`,results.map(x=>JSON.stringify(x)).join("\\n")+"\\n");

const cohort=results
  .filter(x=>Object.values(x.audit||{}).some(a=>a.status==="write_safe"))
  .map(x=>({id:x.id,title:x.title,url:x.url,stored:x.stored,candidates:x.extracted,audit:x.audit}));
await writeFile(`${outputPrefix}-write-safe.jsonl`,cohort.map(x=>JSON.stringify(x)).join("\\n")+"\\n");

const mutations=[];
for(const row of cohort){
  const fields=row.audit||{};
  const e=row.candidates||{};
  const push=(auditKey,dbField,value,evidence)=>{
    if(fields[auditKey]?.status!=="write_safe" || value==null) return;
    mutations.push({id:row.id,source:sourceName,field:dbField,value,precondition:{field:dbField,equals:null},evidence,confidence:"high",mode:"dry_run_only"});
  };
  push("price","price_mad",e.price_mad,{kind:"structured_price",period:e.price_period_candidate,url:row.url});
  push("surface","surface_m2",e.surface_m2,{kind:fields.surface?.reason,url:row.url});
  push("rooms","rooms_count",e.rooms_count,{kind:"explicit_labeled_text",matches:e.room_evidence||[],url:row.url});
  push("bedrooms","bedrooms_count",e.bedrooms_count,{kind:"structured_or_explicit_labeled",url:row.url});
  push("bathrooms","bathrooms_count",e.bathrooms_count,{kind:"structured_or_explicit_labeled",url:row.url});
}
await writeFile(`${outputPrefix}-mutation-plan.jsonl`,mutations.map(x=>JSON.stringify(x)).join("\\n")+"\\n");
console.log(JSON.stringify(summary,null,2));
