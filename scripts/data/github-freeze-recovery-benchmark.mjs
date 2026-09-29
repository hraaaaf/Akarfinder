import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import readline from "node:readline";
import crypto from "node:crypto";

const USER_AGENT="AkarFinderRecoveryAudit";
const sourceName=(process.env.SOURCE_NAME||"marocimmo.com").toLowerCase();
const inputPath=process.env.FREEZE_JSONL_GZ||".tmp/freeze/clean-corpus-v4.11-core.jsonl.gz";
const outputPrefix=process.env.OUTPUT_PREFIX||sourceName.replace(/[^a-z0-9]+/g,"-");
const limit=Math.max(1,Math.min(300,Number(process.env.SAMPLE_SIZE||120)));

function stableRank(url){return crypto.createHash("sha256").update(url).digest("hex");}
const candidates=[];
const rl=readline.createInterface({input:createReadStream(inputPath).pipe(createGunzip()),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim()) continue;
  const row=JSON.parse(line);
  if(String(row.source_domain||"").toLowerCase()!==sourceName) continue;
  if(row.classification!=="KEEP" || row.scope_eligible!==true) continue;
  candidates.push(row);
}
candidates.sort((a,b)=>stableRank(a.canonical_url).localeCompare(stableRank(b.canonical_url)));
const sample=candidates.slice(0,limit);

const amountRe=/([0-9]{1,3}(?:[ .,'’][0-9]{3})+|[0-9]{4,10})\s*(?:mad|dhs?|dh|dirhams?)/giu;
const surfaceRe=/([0-9]{1,7})\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/giu;
const patterns={
 bedrooms:[/(?:chambres?|bedrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:chambres?|bedrooms?)\b/giu],
 bathrooms:[/(?:salles?\s*de\s*bain|sdb|bathrooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:salles?\s*de\s*bain|sdb|bathrooms?)\b/giu],
 rooms:[/(?:pi[eè]ces?|rooms?)\s*[:=-]?\s*(\d{1,2})\b/giu,/(\d{1,2})\s*(?:pi[eè]ces?|rooms?)\b/giu],
};
function unique(re,text){re.lastIndex=0;return [...new Set([...text.matchAll(re)].map(m=>Number(m[1].replace(/[^0-9]/g,''))).filter(Number.isFinite))];}
function one(re,text){const v=unique(re,text);return v.length===1?v[0]:null;}
function oneAny(res,text){const v=[...new Set(res.flatMap(re=>unique(re,text)))];return v.length===1?v[0]:null;}
function htmlToText(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');}
function metaContent(html,key){
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  const target=key.toLowerCase();
  for(const tag of tags){
    const name=(tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)||[])[1]?.toLowerCase();
    if(name!==target) continue;
    return (tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)||[])[1]||null;
  }
  return null;
}
function structuredListing(html,pageUrl){
  const nodes=[];
  for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const p=JSON.parse(m[1]); const stack=Array.isArray(p)?p:[p];
      for(const item of stack){if(item&&typeof item==="object"&&Array.isArray(item["@graph"])) nodes.push(...item["@graph"]); else nodes.push(item);}
    }catch{}
  }
  const listings=nodes.filter(n=>{const t=n?.["@type"];return t==="RealEstateListing"||(Array.isArray(t)&&t.includes("RealEstateListing"));});
  const norm=u=>{try{const x=new URL(u);return x.origin+x.pathname.replace(/\/$/,"");}catch{return null;}};
  const target=norm(pageUrl);
  const exact=listings.filter(n=>norm(n?.url)===target);
  if(exact.length===1) return exact[0];
  if(listings.length===1) return listings[0];
  return null;
}
function num(v){if(v==null||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function cadence(text,category){
  const s=(String(text||"")+" "+String(category||"")).toLowerCase();
  const non=/(?:par\s*jour|journalier|quotidien|journ[ée]e|nuit[ée]?e?|courte\s+dur[ée]e|location\s+vacances|vacances|\bعطلات\b|\bيومي|\bليلة)/iu.test(s);
  const mon=/(?:par\s*mois|\/\s*mois|mensuel(?:le)?|loyer\s+mensuel|\bشهري(?:ا|ًا)?\b)/iu.test(s);
  if(non&&mon)return"mixed"; if(non)return"non_monthly"; if(mon)return"monthly"; return"unknown";
}
function extract(html,url){
  const full=htmlToText(html);
  const listing=structuredListing(html,url);
  const meta=[metaContent(html,"og:title"),metaContent(html,"og:description"),metaContent(html,"description")].filter(Boolean).join(" ");
  const structuredText=[listing?.name,listing?.description].filter(Boolean).join(" ");
  const primaryText=[structuredText,meta].filter(Boolean).join(" ").trim();
  const text=sourceName==="sarout.ma"?(structuredText||meta||""):(primaryText||"");
  const cat=String(listing?.category||"").toLowerCase();
  let price=null,price_reason=null,price_period=null;
  if(sourceName==="sarout.ma"){
    const offers=Array.isArray(listing?.offers)?listing.offers:[listing?.offers].filter(Boolean);
    const prices=[...new Set(offers.map(o=>num(o?.price)).filter(v=>v!=null))];
    const currencies=[...new Set(offers.map(o=>String(o?.priceCurrency||"").toUpperCase()).filter(Boolean))];
    const period=cadence(text,cat); price_period=period;
    if(prices.length!==1) price_reason=prices.length?"multiple_offers":"no_offer";
    else if(currencies.length&&!currencies.includes("MAD")) price_reason="non_mad";
    else if(/vente|بيع/u.test(cat)){ if(prices[0]>=10000) price=prices[0]; else price_reason="sale_too_low"; price_period="sale"; }
    else if(/location|إيجار|عطلات/u.test(cat)){
      if(period==="mixed") price_reason="mixed_cadence";
      else if(period==="non_monthly") price_reason="non_monthly";
      else if(/vacances|عطلات/u.test(cat)&&period!=="monthly") price_reason="vacation_without_monthly_proof";
      else if(period!=="monthly") price_reason="unknown_rental_cadence";
      else if(prices[0]>=1000) price=prices[0]; else price_reason="rent_too_low";
    } else price_reason="unknown_transaction_category";
  }else{
    const u=String(url||"").toLowerCase();
    let segs=[];
    try{segs=new URL(u).pathname.split("/").filter(Boolean);}catch{}
    if(["fr","en","ar"].includes(segs[0])) segs=segs.slice(1);
    const routeSegs=sourceName==="promoimmomarrakech.com"?segs.slice(0,3):segs.slice(0,2);
    const saleSeg=s=>sourceName==="promoimmomarrakech.com"
      ? /(?:^|-)(?:vente|vendre|sale|buy|achat)(?:-|$)/i.test(s||"")
      : /^(?:vente|vendre|sale|buy|achat)(?:-|$)/i.test(s||"");
    const rentSeg=s=>sourceName==="promoimmomarrakech.com"
      ? /(?:^|-)(?:location|louer|rental|rent)(?:-|$)/i.test(s||"")
      : /^(?:location|louer|rental|rent)(?:-|$)/i.test(s||"");
    const shortStay=routeSegs.some(s=>/(?:^|-)(?:location|rental|rent)-(?:s[eé]?jour|vacances?|courte[-_]?dur[eé]e)(?:-|$)/i.test(s||""));
    const saroutyPath=decodeURIComponent(u);
    const saroutySale=sourceName==="sarouty.ma" && /(?:\/acheter\/|\/professionnel-acheter\/|\/للبيع\/)/u.test(saroutyPath);
    const saroutyRent=sourceName==="sarouty.ma" && /(?:\/louer\/|\/professionnel-louer\/|\/للكراء\/)/u.test(saroutyPath);
    const soukSale=sourceName==="soukimmobilier.com" && /(?:\b(?:à|a)\s+vendre\b|\bfor\s+sale\b|للبيع)/iu.test(text);
    const soukRent=sourceName==="soukimmobilier.com" && /(?:\b(?:à|a)\s+louer\b|\bfor\s+rent\b|للكراء)/iu.test(text);
    const lsfPath=decodeURIComponent(u);
    const lsfSale=sourceName==="limmobiliersansfrontieres.com" && /\/property\/[^/?#]*(?:a-vendre|vente)(?:-|$)/iu.test(lsfPath);
    const lsfRent=sourceName==="limmobiliersansfrontieres.com" && /\/property\/[^/?#]*(?:a-louer|location)(?:-|$)/iu.test(lsfPath);
    const lsfShort=sourceName==="limmobiliersansfrontieres.com" && /(?:nuitee|vacances?|saison|courte[-_]?duree)/iu.test(lsfPath);
    const transaction=saroutySale?"sale":saroutyRent?"rent":soukSale?"sale":soukRent?"rent":lsfSale?"sale":lsfRent?"rent":routeSegs.some(saleSeg)?"sale":routeSegs.some(rentSeg)?"rent":"unknown";
    const period=cadence(text,""); price_period=transaction==="sale"?"sale":period;
    const offers=Array.isArray(listing?.offers)?listing.offers:[listing?.offers].filter(Boolean);
    const structuredPrices=[...new Set(offers.map(o=>num(o?.price)).filter(v=>v!=null))];
    const currencies=[...new Set(offers.map(o=>String(o?.priceCurrency||"").toUpperCase()).filter(Boolean))];
    const textPrices=unique(amountRe,text).filter(x=>x>=100&&x<=500000000);
    const mdh=[...text.matchAll(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*M\s*dh\b/giu)]
      .map(m=>Math.round(Number(m[1].replace(",", "."))*1_000_000))
      .filter(x=>Number.isFinite(x)&&x>=10000&&x<=500000000);
    for(const v of mdh) if(!textPrices.includes(v)) textPrices.push(v);
    const prices=structuredPrices.length?structuredPrices:textPrices;
    if(!text) price_reason="no_primary_evidence";
    else if(prices.length===1){
      const candidate=prices[0];
      if(currencies.length&&!currencies.includes("MAD")) price_reason="non_mad";
      else if(transaction==="sale"&&candidate<10000) price_reason="sale_too_low";
      else if(transaction==="rent"&&(shortStay||lsfShort)) price_reason="short_stay_route";
      else if(transaction==="rent"&&period==="mixed") price_reason="mixed_cadence";
      else if(transaction==="rent"&&period==="non_monthly") price_reason="non_monthly";
      else if(transaction==="rent"&&period!=="monthly") price_reason="unknown_rental_cadence";
      else if(transaction==="rent"&&candidate<500) price_reason="rent_too_low";
      else if(transaction==="unknown") price_reason="unknown_transaction";
      else price=candidate;
    } else if(prices.length>1) price_reason="ambiguous";
    else price_reason="no_explicit_price";
  }
  let price_quality="candidate";
  if(price!=null){
    const surface=sourceName==="sarout.ma"&&listing?.floorSize?.unitCode==="MTK"?num(listing.floorSize.value):one(surfaceRe,text);
    const isSale=price_period==="sale";
    const isLand=/(?:^|[\/-])(?:terrain|land)(?:[\/-]|$)/i.test(url||"") || /\b(?:terrain|land)\b/i.test(listing?.name||"") || /أرض/u.test(listing?.name||"");
    if(isSale&&surface&&surface>0&&!isLand){
      const ppm2=price/surface;
      if(ppm2<500||ppm2>100000){price_reason="sale_price_per_m2_outlier";price_quality="quarantine";price=null;}
    }
  }
  return {
    price_mad:price,price_rejection_reason:price_reason,price_period_candidate:price_period,price_quality,
    surface_m2:listing?.floorSize?.unitCode==="MTK"?(num(listing.floorSize.value)??one(surfaceRe,text)):one(surfaceRe,text),
    bedrooms_count:num(listing?.numberOfBedrooms)??oneAny(patterns.bedrooms,text),
    bathrooms_count:num(listing?.numberOfBathroomsTotal)??oneAny(patterns.bathrooms,text),
    rooms_count:oneAny(patterns.rooms,text),
    evidence_scope: primaryText?"structured_or_meta_primary":"none",
    structured:listing?{name:listing.name??null,description:listing.description??null,category:listing.category??null,offers:listing.offers??null,floorSize:listing.floorSize??null,numberOfBedrooms:listing.numberOfBedrooms??null,numberOfBathroomsTotal:listing.numberOfBathroomsTotal??null}:null
  };
}
const robotsCache=new Map();
function parseRobots(text){const groups=[];let cur=null;for(const raw of text.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim();if(!line)continue;const i=line.indexOf(':');if(i<0)continue;const k=line.slice(0,i).trim().toLowerCase(),v=line.slice(i+1).trim();if(k==="user-agent"){if(!cur||cur.rules.length){cur={agents:[],rules:[]};groups.push(cur);}cur.agents.push(v.toLowerCase());}else if(cur&&(k==="allow"||k==="disallow"))cur.rules.push({kind:k,path:v});}return groups;}
async function robotsFor(url){const origin=new URL(url).origin;if(robotsCache.has(origin))return robotsCache.get(origin);try{const r=await fetch(origin+"/robots.txt",{signal:AbortSignal.timeout(5000),headers:{"user-agent":USER_AGENT+"/1.0"}});const v=r.status===404||r.status===410?{state:"absent",groups:[]}:r.ok?{state:"loaded",groups:parseRobots(await r.text())}:{state:"unknown",groups:[]};robotsCache.set(origin,v);return v;}catch{const v={state:"unknown",groups:[]};robotsCache.set(origin,v);return v;}}
function allowed(url,r){if(r.state==="absent")return true;if(r.state!=="loaded")return false;const path=new URL(url).pathname||"/";const groups=r.groups.filter(g=>g.agents.includes("*"));if(!groups.length)return true;const m=groups.flatMap(g=>g.rules).filter(x=>x.path&&path.startsWith(x.path)).sort((a,b)=>b.path.length-a.path.length);return !m.length||m[0].kind==="allow";}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const results=[];
for(const row of sample){
 const url=row.canonical_url, started=Date.now(), rob=await robotsFor(url);
 if(!allowed(url,rob)){results.push({url,freeze:row,robots_allowed:false,accessible:false,extracted:null});continue;}
 try{
  const res=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(8000),headers:{"user-agent":USER_AGENT+"/1.0 (+github-freeze benchmark)","accept":"text/html"}});
  const ct=res.headers.get("content-type")||""; const html=res.status===200&&ct.includes("text/html")?await res.text():"";
  results.push({url,freeze:row,robots_allowed:true,http_status:res.status,accessible:res.status===200&&!!html,elapsed_ms:Date.now()-started,extracted:html?extract(html,url):null});
 }catch(e){results.push({url,freeze:row,robots_allowed:true,http_status:null,accessible:false,error:e?.name||"fetch_error",extracted:null});}
 await sleep(250);
}
const fields=["price_mad","surface_m2","bedrooms_count","bathrooms_count","rooms_count"];
const summary={source:sourceName,freeze_artifact_id:10910779576,freeze_rows:226286,freeze_source_candidates:candidates.length,sample_size:sample.length,robots_allowed:results.filter(x=>x.robots_allowed).length,accessible:results.filter(x=>x.accessible).length,recovered:{},recovery_from_null:{},validation_matches:{},conflicts:{},price_rejections:{},database_access:0,database_writes:0,source_site_fetches:results.filter(x=>x.robots_allowed).length};
const cohort=[];
for(const x of results){
  if(!x.extracted)continue;
  for(const f of fields){
    const ev=x.extracted[f], old=x.freeze?.[f];
    if(ev==null) continue;
    summary.recovered[f]=(summary.recovered[f]||0)+1;
    if(old==null){
      summary.recovery_from_null[f]=(summary.recovery_from_null[f]||0)+1;
      const st=x.extracted.structured||{};
      let evidence_method="primary_text_unique", confidence="review";
      if(f==="price_mad"){evidence_method="structured_or_primary_price_guarded";confidence="high";}
      else if(f==="surface_m2"&&st.floorSize?.unitCode==="MTK"&&Number(st.floorSize?.value)===Number(ev)){evidence_method="jsonld_floorSize_MTK";confidence="high";}
      else if(f==="bedrooms_count"&&st.numberOfBedrooms!=null&&Number(st.numberOfBedrooms)===Number(ev)){evidence_method="jsonld_numberOfBedrooms";confidence="high";}
      else if(f==="bathrooms_count"&&st.numberOfBathroomsTotal!=null&&Number(st.numberOfBathroomsTotal)===Number(ev)){evidence_method="jsonld_numberOfBathroomsTotal";confidence="high";}
      else if(f==="rooms_count"&&x.extracted.evidence_scope==="structured_or_meta_primary"){evidence_method="explicit_labeled_primary_text";confidence="high";}
      cohort.push({url:x.url,source:sourceName,field:f,value:ev,freeze_value:null,evidence_scope:x.extracted.evidence_scope,evidence_method,confidence,price_period_candidate:x.extracted.price_period_candidate,mode:confidence==="high"?"offline_write_safe":"offline_review"});
    } else if(Number(old)===Number(ev)) summary.validation_matches[f]=(summary.validation_matches[f]||0)+1;
    else summary.conflicts[f]=(summary.conflicts[f]||0)+1;
  }
  if(x.extracted.price_rejection_reason) summary.price_rejections[x.extracted.price_rejection_reason]=(summary.price_rejections[x.extracted.price_rejection_reason]||0)+1;
}
await writeFile(`${outputPrefix}.json`,JSON.stringify(summary,null,2)+"\n");
await writeFile(`${outputPrefix}.jsonl`,results.map(x=>JSON.stringify(x)).join("\n")+"\n");
await writeFile(`${outputPrefix}-offline-cohort.jsonl`,cohort.map(x=>JSON.stringify(x)).join("\n")+"\n");
const writeSafe=cohort.filter(x=>x.confidence==="high");
const review=cohort.filter(x=>x.confidence!=="high");
summary.offline_write_safe=Object.fromEntries([...new Set(writeSafe.map(x=>x.field))].map(f=>[f,writeSafe.filter(x=>x.field===f).length]));
summary.offline_review=Object.fromEntries([...new Set(review.map(x=>x.field))].map(f=>[f,review.filter(x=>x.field===f).length]));
await writeFile(`${outputPrefix}-offline-write-safe.jsonl`,writeSafe.map(x=>JSON.stringify(x)).join("\n")+"\n");
await writeFile(`${outputPrefix}-offline-review.jsonl`,review.map(x=>JSON.stringify(x)).join("\n")+"\n");
await writeFile(`${outputPrefix}.json`,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
